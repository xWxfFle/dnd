import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { combatants, combats, scenes, tokens } from '../db/schema'
import { loadCombat } from './table'

export async function moveToken(tokenId: string, x: number, y: number) {
  const [row] = await db.update(tokens).set({ x, y }).where(eq(tokens.id, tokenId)).returning()
  return row ?? null
}

export async function changeTokenHp(tokenId: string, delta: number) {
  const [current] = await db.select().from(tokens).where(eq(tokens.id, tokenId)).limit(1)
  if (!current)
    return null
  const hpCurrent = Math.max(0, current.hpCurrent + delta)
  const [row] = await db.update(tokens).set({ hpCurrent }).where(eq(tokens.id, tokenId)).returning()
  if (row) {
    await db.update(combatants).set({ hpCurrent }).where(eq(combatants.tokenId, tokenId))
  }
  return row ?? null
}

export async function deleteToken(tokenId: string) {
  const [token] = await db.select().from(tokens).where(eq(tokens.id, tokenId)).limit(1)
  if (!token)
    return null
  const linked = await db.select().from(combatants).where(eq(combatants.tokenId, tokenId))
  for (const combatant of linked) {
    const mates = await db.select().from(combatants).where(eq(combatants.combatId, combatant.combatId))
    const ordered = mates.sort((a, b) => a.sortOrder - b.sortOrder)
    const index = ordered.findIndex(row => row.id === combatant.id)
    const [combat] = await db.select().from(combats).where(eq(combats.id, combatant.combatId)).limit(1)
    await db.delete(combatants).where(eq(combatants.id, combatant.id))
    const remaining = ordered.length - 1
    if (!combat)
      continue
    if (remaining === 0) {
      await db.delete(combats).where(eq(combats.id, combat.id))
      continue
    }
    const activeIndex = combat.activeIndex > index
      ? combat.activeIndex - 1
      : Math.min(combat.activeIndex, remaining - 1)
    await db.update(combats).set({ activeIndex }).where(eq(combats.id, combat.id))
  }
  await db.delete(tokens).where(eq(tokens.id, tokenId))
  return token
}

export async function setTokenHidden(tokenId: string, hidden: boolean) {
  const [row] = await db.update(tokens).set({ hidden }).where(eq(tokens.id, tokenId)).returning()
  return row ?? null
}

export async function replaceFog(sceneId: string, fog: unknown) {
  const [row] = await db.update(scenes).set({ fog }).where(eq(scenes.id, sceneId)).returning()
  return row ?? null
}

export async function placeCharacterToken(sceneId: string, character: { id: string, name: string, hpCurrent: number, hpMax: number }) {
  const [existing] = await db.select().from(tokens).where(and(eq(tokens.sceneId, sceneId), eq(tokens.characterId, character.id))).limit(1)
  if (existing)
    return existing
  const [token] = await db.insert(tokens).values({
    sceneId,
    name: character.name,
    x: 1,
    y: 1,
    hpCurrent: character.hpCurrent,
    hpMax: character.hpMax,
    hidden: false,
    characterId: character.id,
    color: '#c4a35a',
  }).returning()
  return token
}

export async function removeCharacterToken(sceneId: string, characterId: string) {
  const [existing] = await db.select().from(tokens).where(and(eq(tokens.sceneId, sceneId), eq(tokens.characterId, characterId))).limit(1)
  if (!existing)
    return null
  return deleteToken(existing.id)
}

export async function deleteScene(campaignId: string, sceneId: string) {
  const [scene] = await db.select().from(scenes).where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, campaignId))).limit(1)
  if (!scene)
    return null
  await db.delete(scenes).where(eq(scenes.id, sceneId))
  if (scene.active) {
    const [next] = await db.select().from(scenes).where(eq(scenes.campaignId, campaignId)).limit(1)
    if (next)
      await activateScene(campaignId, next.id)
  }
  return scene
}

export async function activateScene(campaignId: string, sceneId: string) {
  await db.update(scenes).set({ active: false }).where(eq(scenes.campaignId, campaignId))
  const [row] = await db.update(scenes).set({ active: true }).where(and(eq(scenes.id, sceneId), eq(scenes.campaignId, campaignId))).returning()
  return row ?? null
}

export async function startCombat(sceneId: string, role: 'dm' | 'player') {
  const existing = await db.select().from(combats).where(eq(combats.sceneId, sceneId))
  if (existing.length > 0) {
    await db.delete(combats).where(eq(combats.sceneId, sceneId))
  }
  const board = await db.select().from(tokens).where(eq(tokens.sceneId, sceneId))
  const [combat] = await db.insert(combats).values({ sceneId, round: 1, activeIndex: 0 }).returning()
  const ordered = board
    .map(token => ({
      token,
      initiative: Math.floor(Math.random() * 20) + 1 + (token.monsterId ? 2 : 0),
    }))
    .sort((a, b) => b.initiative - a.initiative)
  if (ordered.length > 0) {
    await db.insert(combatants).values(ordered.map((entry, index) => ({
      combatId: combat.id,
      tokenId: entry.token.id,
      name: entry.token.name,
      initiative: entry.initiative,
      hpCurrent: entry.token.hpCurrent,
      hpMax: entry.token.hpMax,
      hidden: entry.token.hidden,
      sortOrder: index,
    })))
  }
  return loadCombat(sceneId, role)
}

export async function advanceCombat(sceneId: string, role: 'dm' | 'player') {
  const [combat] = await db.select().from(combats).where(eq(combats.sceneId, sceneId)).limit(1)
  if (!combat)
    return null
  const rows = await db.select().from(combatants).where(eq(combatants.combatId, combat.id))
  if (rows.length === 0)
    return loadCombat(sceneId, role)
  const next = combat.activeIndex + 1
  const wrapped = next >= rows.length
  const activeIndex = wrapped ? 0 : next
  await db.update(combats).set({
    activeIndex,
    round: wrapped ? combat.round + 1 : combat.round,
  }).where(eq(combats.id, combat.id))
  const current = rows.sort((a, b) => a.sortOrder - b.sortOrder)[combat.activeIndex]
  if (current) {
    await db.update(combatants).set({ slotSpentThisTurn: false }).where(eq(combatants.id, current.id))
  }
  const upcoming = rows.sort((a, b) => a.sortOrder - b.sortOrder)[activeIndex]
  if (upcoming)
    await db.update(combatants).set({ slotSpentThisTurn: false }).where(eq(combatants.id, upcoming.id))
  return loadCombat(sceneId, role)
}

export async function endCombat(sceneId: string) {
  await db.delete(combats).where(eq(combats.sceneId, sceneId))
}

export async function spendSlot(combatantId: string) {
  await db.update(combatants).set({ slotSpentThisTurn: true }).where(eq(combatants.id, combatantId))
}
