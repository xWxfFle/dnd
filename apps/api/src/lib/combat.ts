import type { Abilities, AttackDef, InventoryItem, SaveOverrides } from '@dnd/shared'
import { resolveAttack } from '@dnd/shared'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { characters, combatants, combats, scenes, tokens } from '../db/schema'
import { armorFromCharacter, loadCombat, saveRoll } from './table'

export async function updateTokenStats(tokenId: string, patch: {
  name: string
  hpMax: number
  ac: number
  speed: number
  attacks: AttackDef[]
  abilities: Abilities | null
  saves: SaveOverrides | null
  inventory: InventoryItem[]
}) {
  const [current] = await db.select().from(tokens).where(eq(tokens.id, tokenId)).limit(1)
  if (!current)
    return null
  const hpCurrent = Math.min(current.hpCurrent, patch.hpMax)
  const [row] = await db.update(tokens).set({
    name: patch.name,
    hpMax: patch.hpMax,
    hpCurrent,
    ac: patch.ac,
    speed: patch.speed,
    attacks: patch.attacks,
    abilities: patch.abilities,
    saves: patch.saves,
    inventory: patch.inventory,
  }).where(eq(tokens.id, tokenId)).returning()
  await db.update(combatants).set({
    name: row.name,
    hpCurrent: row.hpCurrent,
    hpMax: row.hpMax,
  }).where(eq(combatants.tokenId, tokenId))
  return row
}

export async function moveToken(tokenId: string, x: number, y: number) {
  const [row] = await db.update(tokens).set({ x, y }).where(eq(tokens.id, tokenId)).returning()
  return row ?? null
}

export async function changeTokenHp(tokenId: string, delta: number) {
  const [current] = await db.select().from(tokens).where(eq(tokens.id, tokenId)).limit(1)
  if (!current)
    return null
  const hpCurrent = Math.max(0, current.hpCurrent + delta)
  await writeHp(tokenId, current.characterId, hpCurrent)
  return { ...current, hpCurrent }
}

const strikeVerdict = {
  miss: () => 'промах',
  hit: (damage: number) => `попадание, снято ${damage}`,
  crit: (damage: number) => `крит, снято ${damage}`,
} as const satisfies Record<'miss' | 'hit' | 'crit', (damage: number) => string>

export async function resolveStrike(input: {
  campaignId: string
  userId: string
  attack: AttackDef
  attackerTokenId: string
  targetTokenId: string
}) {
  const target = await tokenInCampaign(input.targetTokenId, input.campaignId)
  const attacker = await tokenInCampaign(input.attackerTokenId, input.campaignId)
  if (!target || !attacker)
    return { ok: false as const, error: 'Цели нет на карте' }
  const armorClass = await armorOf(target)
  if (armorClass == null)
    return { ok: false as const, error: 'У цели нет класса доспеха' }
  const exhaustion = attacker.characterId ? await exhaustionOf(attacker.characterId) : 0
  const strike = resolveAttack({ attack: input.attack, armorClass, exhaustion })
  if (strike.hit)
    await applyDamage(target.id, target.characterId, strike.damage)
  const verdict = strikeVerdict[verdictKind(strike.hit, strike.critical)](strike.damage)
  await saveRoll({
    campaignId: input.campaignId,
    userId: input.userId,
    label: `${input.attack.name} → ${target.name}: ${verdict}`,
    formula: attackFormula(input.attack.attackBonus),
    mode: 'normal',
    rolls: strike.attack.rolls,
    total: strike.attack.total,
  })
  return { ok: true as const }
}

function attackFormula(bonus: number) {
  if (bonus === 0)
    return '1d20'
  if (bonus > 0)
    return `1d20+${bonus}`
  return `1d20${bonus}`
}

function verdictKind(hit: boolean, critical: boolean) {
  if (!hit)
    return 'miss' as const
  if (critical)
    return 'crit' as const
  return 'hit' as const
}

async function tokenInCampaign(tokenId: string, campaignId: string) {
  const [token] = await db.select().from(tokens).where(eq(tokens.id, tokenId)).limit(1)
  if (!token)
    return null
  const [scene] = await db.select().from(scenes).where(eq(scenes.id, token.sceneId)).limit(1)
  if (!scene || scene.campaignId !== campaignId)
    return null
  return token
}

async function armorOf(token: { characterId: string | null, ac: number | null }) {
  if (token.characterId) {
    const [sheet] = await db.select().from(characters).where(eq(characters.id, token.characterId)).limit(1)
    return sheet ? armorFromCharacter(sheet) : null
  }
  return token.ac
}

async function exhaustionOf(characterId: string) {
  const [sheet] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1)
  return sheet?.exhaustion ?? 0
}

async function applyDamage(tokenId: string, characterId: string | null, amount: number) {
  const [token] = await db.select().from(tokens).where(eq(tokens.id, tokenId)).limit(1)
  if (!token)
    return
  let left = Math.max(0, amount)
  let hpCurrent = token.hpCurrent
  if (characterId) {
    const [sheet] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1)
    if (sheet) {
      const absorbed = Math.min(sheet.hpTemp, left)
      left -= absorbed
      hpCurrent = Math.max(0, sheet.hpCurrent - left)
      await db.update(characters).set({ hpCurrent, hpTemp: sheet.hpTemp - absorbed }).where(eq(characters.id, characterId))
      await db.update(tokens).set({ hpCurrent }).where(eq(tokens.id, tokenId))
      await db.update(combatants).set({ hpCurrent }).where(eq(combatants.tokenId, tokenId))
      return
    }
  }
  hpCurrent = Math.max(0, token.hpCurrent - left)
  await writeHp(tokenId, null, hpCurrent)
}

async function writeHp(tokenId: string, characterId: string | null, hpCurrent: number) {
  await db.update(tokens).set({ hpCurrent }).where(eq(tokens.id, tokenId))
  await db.update(combatants).set({ hpCurrent }).where(eq(combatants.tokenId, tokenId))
  if (characterId)
    await db.update(characters).set({ hpCurrent }).where(eq(characters.id, characterId))
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
      initiative: Math.floor(Math.random() * 20) + 1 + (token.characterId ? 0 : 2),
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
