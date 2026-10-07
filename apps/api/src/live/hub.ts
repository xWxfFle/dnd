import type { CampaignRole } from '@dnd/shared'
import { rollRequestSchema, strikeRequestSchema } from '@dnd/shared'
import { advanceCombat, changeTokenHp, deleteToken, endCombat, moveToken, replaceFog, resolveStrike, sceneInCampaign, setTokenHidden, spendSlot, startCombat, tokenInCampaign } from '../lib/combat'
import { loadCampaignState, recordRoll, viewSnapshot } from '../lib/table'

interface Client {
  campaignId: string
  userId: string
  role: CampaignRole
  send: (payload: unknown) => void
}

const rooms = new Map<string, Set<Client>>()
const delayedBroadcast = new Map<string, ReturnType<typeof setTimeout>>()
const pendingMoves = new Map<string, { campaignId: string, x: number, y: number }>()
const moveDelayMs = 80

export function joinRoom(client: Client) {
  const room = rooms.get(client.campaignId) ?? new Set()
  room.add(client)
  rooms.set(client.campaignId, room)
  return () => {
    room.delete(client)
  }
}

export async function broadcast(campaignId: string) {
  clearDelayed(campaignId)
  await flushMoves(campaignId)
  await sendSnapshot(campaignId)
}

function scheduleMoveBroadcast(campaignId: string) {
  clearDelayed(campaignId)
  delayedBroadcast.set(campaignId, setTimeout(() => {
    delayedBroadcast.delete(campaignId)
    void flushMoves(campaignId).then(() => sendSnapshot(campaignId))
  }, moveDelayMs))
}

function clearDelayed(campaignId: string) {
  const timer = delayedBroadcast.get(campaignId)
  if (!timer)
    return
  clearTimeout(timer)
  delayedBroadcast.delete(campaignId)
}

async function flushMoves(campaignId: string) {
  const batch = [...pendingMoves].filter(([, move]) => move.campaignId === campaignId)
  for (const [tokenId, move] of batch) {
    pendingMoves.delete(tokenId)
    await moveToken(tokenId, move.x, move.y)
  }
}

async function sendSnapshot(campaignId: string) {
  const room = rooms.get(campaignId)
  if (!room || room.size === 0)
    return
  const state = await loadCampaignState(campaignId)
  if (!state)
    return
  for (const client of room)
    client.send({ type: 'snapshot', snapshot: viewSnapshot(state, client) })
}

export async function handleLiveMessage(client: Client, raw: unknown) {
  let message: Record<string, unknown>
  try {
    message = typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown> : raw as Record<string, unknown>
  }
  catch {
    client.send({ type: 'error', error: 'Сообщение не разобрать' })
    return
  }
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
    const token = await tokenInCampaign(message.tokenId, client.campaignId)
    if (!token)
      return
    pendingMoves.set(token.id, { campaignId: client.campaignId, x: Number(message.x), y: Number(message.y) })
    scheduleMoveBroadcast(client.campaignId)
    return
  }
  else if (type === 'hp' && typeof message.tokenId === 'string') {
    const token = await tokenInCampaign(message.tokenId, client.campaignId)
    if (!token)
      return
    await changeTokenHp(token.id, Number(message.delta))
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
    const scene = await sceneInCampaign(message.sceneId, client.campaignId)
    if (!scene)
      return
    await replaceFog(scene.id, Array.isArray(message.fog) ? message.fog : [])
  }
  else if (type === 'token.hide' && typeof message.tokenId === 'string') {
    const token = await tokenInCampaign(message.tokenId, client.campaignId)
    if (!token)
      return
    await setTokenHidden(token.id, Boolean(message.hidden))
  }
  else if (type === 'token.delete' && typeof message.tokenId === 'string') {
    const token = await tokenInCampaign(message.tokenId, client.campaignId)
    if (!token)
      return
    await deleteToken(token.id)
  }
  else if (type === 'combat.start' && typeof message.sceneId === 'string') {
    const scene = await sceneInCampaign(message.sceneId, client.campaignId)
    if (!scene)
      return
    await startCombat(scene.id, client.role)
  }
  else if (type === 'combat.next' && typeof message.sceneId === 'string') {
    const scene = await sceneInCampaign(message.sceneId, client.campaignId)
    if (!scene)
      return
    await advanceCombat(scene.id, client.role)
  }
  else if (type === 'combat.end' && typeof message.sceneId === 'string') {
    const scene = await sceneInCampaign(message.sceneId, client.campaignId)
    if (!scene)
      return
    await endCombat(scene.id)
  }
  else if (type === 'slot' && typeof message.combatantId === 'string') {
    await spendSlot(message.combatantId)
  }
  else {
    return
  }
  await broadcast(client.campaignId)
}
