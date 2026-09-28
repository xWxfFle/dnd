import path from 'node:path'
import { API_VERSION, APP_NAME } from '@dnd/shared'
import { cors } from '@elysiajs/cors'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Elysia } from 'elysia'
import { db } from './db'
import { getCampaignRole } from './lib/rbac'
import { ensureDemoUsers, ensureSrd } from './lib/table'
import { handleLiveMessage, joinRoom } from './live/hub'
import { authModule, jwtPlugin, verifyToken } from './modules/auth'
import { campaignsModule, sceneImageModule } from './modules/campaigns'
import { srdModule } from './modules/srd'

const port = Number(process.env.PORT ?? 3000)

const app = new Elysia()
  .use(cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  }))
  .use(jwtPlugin)
  .get('/health', () => ({ status: 'ok' as const, service: 'api' }))
  .get('/', () => ({ name: APP_NAME, version: API_VERSION }))
  .use(authModule)
  .use(campaignsModule)
  .use(srdModule)
  .use(sceneImageModule)
  .ws('/live/:campaignId', {
    async open(ws) {
      const token = new URL(ws.data.request.url).searchParams.get('token') ?? ''
      const userId = await verifyToken(ws.data.jwt, token)
      const campaignId = ws.data.params.campaignId
      if (!userId) {
        ws.close()
        return
      }
      const role = await getCampaignRole(userId, campaignId)
      if (!role) {
        ws.close()
        return
      }
      const leave = joinRoom({
        campaignId,
        userId,
        role,
        send: payload => ws.send(payload),
      })
      ;(ws.data as { leave?: () => void }).leave = leave
      const snapshot = await import('./lib/table').then(mod => mod.buildSnapshot(userId, campaignId))
      ws.send({ type: 'snapshot', snapshot })
    },
    async message(ws, message) {
      const token = new URL(ws.data.request.url).searchParams.get('token') ?? ''
      const userId = await verifyToken(ws.data.jwt, token)
      const campaignId = ws.data.params.campaignId
      if (!userId)
        return
      const role = await getCampaignRole(userId, campaignId)
      if (!role)
        return
      await handleLiveMessage({
        campaignId,
        userId,
        role,
        send: payload => ws.send(payload),
      }, message)
    },
    close(ws) {
      ;(ws.data as { leave?: () => void }).leave?.()
    },
  })
  .onError(({ error, code, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Not found' }
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    console.error(error)
    set.status = 500
    return { error: 'Internal server error' }
  })

async function main() {
  await migrate(db, { migrationsFolder: path.join(import.meta.dir, '../drizzle') })
  await ensureSrd()
  await ensureDemoUsers()
  app.listen(port)
  console.log(`${APP_NAME} API: http://${app.server?.hostname ?? 'localhost'}:${app.server?.port ?? port}`)
}

void main()
