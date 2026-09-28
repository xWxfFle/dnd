import type { CampaignRole } from '@dnd/shared'
import { Elysia } from 'elysia'
import { getCampaignRole } from '../../lib/rbac'
import { buildSnapshot } from '../../lib/table'
import { handleLiveMessage, joinRoom } from '../../live/hub'
import { jwtPlugin, verifyToken } from '../../plugins/jwt'

interface LiveSession {
  campaignId: string
  userId: string
  role: CampaignRole
  leave: () => void
}

const sessions = new WeakMap<object, LiveSession>()

export const liveModule = new Elysia({ name: 'live' })
  .use(jwtPlugin)
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
      sessions.set(ws, { campaignId, userId, role, leave })
      const snapshot = await buildSnapshot(userId, campaignId)
      ws.send({ type: 'snapshot', snapshot })
    },
    async message(ws, message) {
      const session = sessions.get(ws)
      if (!session)
        return
      await handleLiveMessage({
        campaignId: session.campaignId,
        userId: session.userId,
        role: session.role,
        send: payload => ws.send(payload),
      }, message)
    },
    close(ws) {
      const session = sessions.get(ws)
      session?.leave()
      sessions.delete(ws)
    },
  })
