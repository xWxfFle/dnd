import path from 'node:path'
import { API_VERSION, APP_NAME } from '@dnd/shared'
import { cors } from '@elysiajs/cors'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Elysia, status, ValidationError } from 'elysia'
import { db } from './db'
import { ensureDemoUsers, ensureSrd } from './lib/table'
import { authModule } from './modules/auth'
import { campaignsModule } from './modules/campaigns'
import { filesModule } from './modules/files'
import { liveModule } from './modules/live'
import { srdModule } from './modules/srd'

const port = Number(process.env.PORT ?? 3000)

function validationMessage(error: ValidationError) {
  const first = error.all[0]
  const text = first?.summary ?? first?.message
  if (typeof text === 'string' && text.length > 0 && text.length < 180)
    return text
  return 'Запрос не прошёл'
}

export const app = new Elysia()
  .onError(({ code, error }) => {
    if (code === 'VALIDATION' && error instanceof ValidationError)
      return status(422, { error: validationMessage(error) })
    if (code === 'PARSE')
      return status(400, { error: 'Запрос не прошёл' })
    if (code === 'NOT_FOUND')
      return status(404, { error: 'Not found' })
    console.error(error)
    return status(500, { error: 'Internal server error' })
  })
  .use(cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  }))
  .get('/health', () => ({ status: 'ok' as const, service: 'api' }))
  .get('/', () => ({ name: APP_NAME, version: API_VERSION }))
  .use(authModule)
  .use(campaignsModule)
  .use(srdModule)
  .use(filesModule)
  .use(liveModule)

async function main() {
  await migrate(db, { migrationsFolder: path.join(import.meta.dir, '../drizzle') })
  await ensureSrd()
  await ensureDemoUsers()
  app.listen(port)
  console.log(`${APP_NAME} API: http://${app.server?.hostname ?? 'localhost'}:${app.server?.port ?? port}`)
}

if (import.meta.main)
  void main()
