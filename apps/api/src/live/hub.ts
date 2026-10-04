import type { CampaignRole } from '@dnd/shared'
import { rollRequestSchema, strikeRequestSchema } from '@dnd/shared'
import { advanceCombat, changeTokenHp, deleteToken, endCombat, moveToken, replaceFog, resolveStrike, setTokenHidden, spendSlot, startCombat } from '../lib/combat'
import { buildSnapshot, recordRoll } from '../lib/table'

interface Client {
  campaignId: string
  userId: string
  role: CampaignRole
  send: (payload: unknown) => void
}

const rooms = new Map<string, Set<Client>>()

export function joinRoom(client: Client) {
  const room = rooms.get(client.campaignId) ?? new Set()
  room.add(client)
  rooms.set(client.campaignId, room)
  return () => {
    room.delete(client)
  }
}

export async function broadcast(campaignId: string) {
  const room = rooms.get(campaignId)
  if (!room)
    return
  for (const client of room) {
    const snapshot = await buildSnapshot(client.userId, campaignId)
    client.send({ type: 'snapshot', snapshot })
  }
}

export async function handleLiveMessage(client: Client, raw: unknown) {
  const message = typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown> : raw as Record<string, unknown>
  const type = String(message.type ?? '')
  const dmOnly = new Set(['fog', 'combat.start', 'combat.next', 'combat.end', 'token.hide', 'token.delete', 'hp', 'scene.notes'])
  if (dmOnly.has(type) && client.role !== 'dm') {
    client.send({ type: 'error', error: 'Только мастер' })
    return
  }
  if (type === 'roll') {
    const parsed = rollRequestSchema.safeParse(message)
    if (!parsed.success) {
      client.send({ type: 'error', error: 'Формула вроде 2d6+3' })
      return
    }
    const roll = await recordRoll({ ...parsed.data, campaignId: client.campaignId, userId: client.userId })
    if (!roll) {
      client.send({ type: 'error', error: 'Формула вроде 2d6+3' })
      return
    }
  }
  else if (type === 'move' && typeof message.tokenId === 'string') {
    await moveToken(message.tokenId, Number(message.x), Number(message.y))
  }
  else if (type === 'hp' && typeof message.tokenId === 'string') {
    await changeTokenHp(message.tokenId, Number(message.delta))
  }
  else if (type === 'strike') {
    const parsed = strikeRequestSchema.safeParse(message)
    if (!parsed.success) {
      client.send({ type: 'error', error: 'Некого атаковать' })
      return
    }
    const strike = await resolveStrike({ ...parsed.data, campaignId: client.campaignId, userId: client.userId })
    if (!strike.ok) {
      client.send({ type: 'error', error: strike.error })
      return
    }
  }
  else if (type === 'fog' && typeof message.sceneId === 'string') {
    await replaceFog(message.sceneId, Array.isArray(message.fog) ? message.fog : [])
  }
  else if (type === 'token.hide' && typeof message.tokenId === 'string') {
    await setTokenHidden(message.tokenId, Boolean(message.hidden))
  }
  else if (type === 'token.delete' && typeof message.tokenId === 'string') {
    await deleteToken(message.tokenId)
  }
  else if (type === 'combat.start' && typeof message.sceneId === 'string') {
    await startCombat(message.sceneId, client.role)
  }
  else if (type === 'combat.next' && typeof message.sceneId === 'string') {
    await advanceCombat(message.sceneId, client.role)
  }
  else if (type === 'combat.end' && typeof message.sceneId === 'string') {
    await endCombat(message.sceneId)
  }
  else if (type === 'slot' && typeof message.combatantId === 'string') {
    await spendSlot(message.combatantId)
  }
  await broadcast(client.campaignId)
}
