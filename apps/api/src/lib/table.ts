import type { Abilities, Ability, AttackDef, CampaignRole, CharacterDto, ClassResource, CombatDto, CreaturePresetDto, DiceRollDto, DieTerm, PendingChoice, SceneDto, Skill, SnapshotDto, SpellSlot, TokenDto } from '@dnd/shared'
import { statSync } from 'node:fs'
import {
  abilities,
  abilityModifier,
  acceptSkillChoice,
  armorClass,
  asiLevelsOf,
  carrySpellSlots,
  concealEnemies,
  equipmentSheet,
  gearByItemId,
  hitDieHeal,
  hitDieSidesForClass,
  hitPointsOnLevelUp,
  isDeadFromExhaustion,
  isSubclassChosen,
  longRestExhaustion,
  originFeatId,
  proficiencyBonus,
  readAbilities,
  readArmorClass,
  readDiceFormula,
  readInventory,
  readSaveOverrides,
  readSpellIds,
  resourcesForLevel,
  rollD20,
  rollDamage,
  rollFormula,
  skills,
  spellSlotsForClass,
  srdById,
  srdCatalog,
  subclassLevelOf,
  unarmoredAbility,
} from '@dnd/shared'
import { and, desc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { db } from '../db'
import {
  campaignMembers,
  campaigns,
  characters,
  combatants,
  combats,
  creaturePresets,
  diceRolls,
  scenes,
  srdEntries,
  tokens,
  users,
} from '../db/schema'
import { hashPassword } from './auth-utils'

type CharacterRow = typeof characters.$inferSelect
type SceneRow = typeof scenes.$inferSelect
type TokenRow = typeof tokens.$inferSelect

function asAbilities(value: unknown): Abilities {
  const row = value as Abilities
  return row
}

function asAbilityList(value: unknown): Ability[] {
  if (!Array.isArray(value))
    return []
  return value.filter((item): item is Ability => typeof item === 'string' && (abilities as readonly string[]).includes(item))
}

function asSkillList(value: unknown): Skill[] {
  if (!Array.isArray(value))
    return []
  return value.filter((item): item is Skill => typeof item === 'string' && (skills as readonly string[]).includes(item))
}

function asAttacks(value: unknown): AttackDef[] {
  return Array.isArray(value) ? value as AttackDef[] : []
}

function asResources(value: unknown): ClassResource[] {
  if (!Array.isArray(value))
    return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object')
      return []
    const row = item as ClassResource
    if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.max !== 'number')
      return []
    const recover = row.recover === 'short' || row.recover === 'shortOne' ? row.recover : 'long'
    return [{ id: row.id, name: row.name, max: row.max, spent: typeof row.spent === 'number' ? row.spent : 0, recover }]
  })
}

function asIdList(value: unknown) {
  if (!Array.isArray(value))
    return []
  return value.filter((item): item is string => typeof item === 'string')
}

const pendingByValue: Record<string, PendingChoice | undefined> = {
  asi: 'asi',
  subclass: 'subclass',
  feat: 'feat',
}

function pendingOf(value: unknown): PendingChoice | null {
  return typeof value === 'string' ? pendingByValue[value] ?? null : null
}

function choiceAtLevel(classId: string, level: number): PendingChoice | null {
  if (level === subclassLevelOf(classId))
    return 'subclass'
  if (!asiLevelsOf(classId).includes(level))
    return null
  return level >= 19 ? 'feat' : 'asi'
}

function gearOfRow(row: Pick<CharacterRow, 'abilities' | 'classId' | 'level' | 'inventory' | 'attacks'>) {
  return equipmentSheet({
    abilities: asAbilities(row.abilities),
    level: row.level,
    inventory: readInventory(row.inventory),
    attacks: asAttacks(row.attacks),
    gearOf: gearByItemId,
    unarmored: unarmoredAbility(row.classId),
  })
}

export function armorFromCharacter(row: Pick<CharacterRow, 'abilities' | 'classId' | 'level' | 'inventory' | 'attacks'>) {
  return gearOfRow(row).ac
}

export function gearFields(row: Pick<CharacterRow, 'abilities' | 'classId' | 'level' | 'attacks'>, inventory: unknown) {
  const gear = gearOfRow({ ...row, inventory })
  return { inventory: gear.inventory, ac: gear.ac, attacks: gear.attacks }
}

const characterKindByValue: Record<string, 'hero' | 'custom' | undefined> = {
  custom: 'custom',
  hero: 'hero',
}

export function toCharacterDto(row: CharacterRow): CharacterDto {
  const gear = gearOfRow(row)
  const storedResources = asResources(row.classResources)
  const storedFeats = asIdList(row.featIds)
  return {
    id: row.id,
    campaignId: row.campaignId,
    userId: row.userId,
    name: row.name,
    speciesId: row.speciesId,
    classId: row.classId,
    subclassId: row.subclassId,
    backgroundId: row.backgroundId,
    level: row.level,
    abilities: asAbilities(row.abilities),
    skillProficiencies: asSkillList(row.skillProficiencies),
    saveProficiencies: saveProficienciesOf(row),
    hpCurrent: row.hpCurrent,
    hpMax: row.hpMax,
    hpTemp: row.hpTemp,
    ac: gear.ac,
    speed: row.speed,
    attacks: gear.attacks,
    spells: Array.isArray(row.spells) ? row.spells as CharacterDto['spells'] : [],
    slots: Array.isArray(row.slots) ? row.slots as CharacterDto['slots'] : [],
    conditions: Array.isArray(row.conditions) ? row.conditions as string[] : [],
    heroicInspiration: row.heroicInspiration,
    exhaustion: row.exhaustion,
    deathSaves: row.deathSaves as CharacterDto['deathSaves'],
    inventory: gear.inventory,
    weaponMasteries: Array.isArray(row.weaponMasteries) ? row.weaponMasteries as string[] : [],
    hitDie: row.hitDie,
    hitDiceRemaining: row.hitDiceRemaining,
    castingAbility: (row.castingAbility as CharacterDto['castingAbility']) ?? null,
    notes: row.notes,
    avatarUrl: row.avatarPath ? markedUrl(`/api/characters/${row.id}/avatar`, row.avatarPath) : null,
    kind: characterKindByValue[row.kind] ?? 'hero',
    classResources: storedResources.length > 0 ? storedResources : resourcesForLevel(row.classId, row.level),
    featureToggles: asIdList(row.featureToggles),
    featIds: storedFeats.length > 0 ? storedFeats : originFeatOf(row.backgroundId),
    pendingChoice: pendingOf(row.pendingChoice) ?? pendingSubclassOf(row),
  }
}

function originFeatOf(backgroundId: string) {
  const id = originFeatId(backgroundId)
  return id ? [id] : []
}

function pendingSubclassOf(row: Pick<CharacterRow, 'classId' | 'subclassId' | 'level'>): PendingChoice | null {
  if (row.level < subclassLevelOf(row.classId) || isSubclassChosen(row.subclassId))
    return null
  return 'subclass'
}

export function toSceneDto(row: SceneRow, role: CampaignRole): SceneDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    imageUrl: row.imagePath ? markedUrl(`/api/scenes/${row.id}/image`, row.imagePath) : null,
    grid: row.grid as SceneDto['grid'],
    fog: row.fog as SceneDto['fog'],
    dmNotes: role === 'dm' ? row.dmNotes : undefined,
    active: row.active,
  }
}

export function toTokenDto(row: TokenRow, characterAvatarPath: string | null = null): TokenDto {
  return {
    id: row.id,
    sceneId: row.sceneId,
    name: row.name,
    x: row.x,
    y: row.y,
    size: row.size,
    hpCurrent: row.hpCurrent,
    hpMax: row.hpMax,
    hidden: row.hidden,
    characterId: row.characterId,
    monsterId: row.monsterId,
    color: row.color,
    ac: row.ac,
    speed: row.speed,
    attacks: asAttacks(row.attacks),
    ...tokenScores(row),
    inventory: readInventory(row.inventory),
    imageUrl: tokenImageUrl(row, characterAvatarPath),
    obscured: false,
  }
}

function tokenScores(row: TokenRow) {
  const stored = readAbilities(row.abilities)
  if (!stored)
    return { abilities: null, saves: null }
  return { abilities: stored, saves: readSaveOverrides(row.saves) }
}

function tokenImageUrl(row: TokenRow, characterAvatarPath: string | null) {
  if (row.imagePath)
    return markedUrl(`/api/tokens/${row.id}/image`, row.imagePath)
  if (row.characterId && characterAvatarPath)
    return markedUrl(`/api/characters/${row.characterId}/avatar`, characterAvatarPath)
  return null
}

function markedUrl(path: string, filePath: string) {
  return `${path}?v=${fileMark(filePath)}`
}

function fileMark(filePath: string) {
  let mark = 0
  for (const char of filePath)
    mark = (mark * 31 + char.charCodeAt(0)) >>> 0
  try {
    mark = (mark + Math.round(statSync(filePath).mtimeMs)) >>> 0
  }
  catch {
    return mark.toString(36)
  }
  return mark.toString(36)
}

function srd(id: string) {
  return srdCatalog.find(entry => entry.id === id)
}

function saveProficienciesOf(row: CharacterRow) {
  const stored = asAbilityList(row.saveProficiencies)
  if (stored.length > 0)
    return stored
  return asAbilityList(srd(row.classId)?.body.saves)
}

function knownSpellFromSrd(entry: { id: string, name: string, body: Record<string, unknown> }): CharacterDto['spells'][number] {
  const level = Number(entry.body.level ?? 0)
  const dice = typeof entry.body.dice === 'string' ? entry.body.dice : ''
  const text = typeof entry.body.text === 'string' ? entry.body.text : ''
  return {
    id: entry.id,
    name: entry.name,
    level: Number.isFinite(level) ? Math.min(9, Math.max(0, Math.trunc(level))) : 0,
    ...(dice ? { dice } : {}),
    ...(text ? { text: text.slice(0, 600) } : {}),
  }
}

export async function createCharacter(input: {
  campaignId: string
  userId: string
  name: string
  speciesId: string
  classId: string
  backgroundId: string
  abilities: Abilities
  skillProficiencies: Skill[]
}) {
  const classEntry = srd(input.classId)
  const species = srd(input.speciesId)
  const background = srd(input.backgroundId)
  if (!classEntry || classEntry.kind !== 'class' || !species || !background)
    return null
  const picked = acceptSkillChoice(input.skillProficiencies, input.classId, input.backgroundId)
  if (!picked)
    return null
  const saveProficiencies = asAbilityList(classEntry.body.saves)
  if (saveProficiencies.length === 0)
    return null
  const hitDie = String(classEntry.body.hitDie ?? 'd8')
  const sides = hitDieSidesForClass(hitDie)
  const con = abilityModifier(input.abilities.con)
  const hpMax = Math.max(1, sides + con)
  const speed = Number(species.body.speed ?? 30)
  const casting = (classEntry.body.casting as CharacterDto['castingAbility']) ?? null
  const spellAttack = casting
    ? [{
        id: 'spell',
        name: 'Атака заклинанием',
        attackBonus: abilityModifier(input.abilities[casting]) + 2,
        damageDice: '1d10',
        damageBonus: 0,
        damageType: 'сила',
      }]
    : []
  const knownSpells = readSpellIds(classEntry.body)
    .map(id => srd(id))
    .filter((entry): entry is NonNullable<ReturnType<typeof srd>> => entry?.kind === 'spell')
    .map(entry => knownSpellFromSrd(entry))
  const originFeat = originFeatId(input.backgroundId)
  const [row] = await db.insert(characters).values({
    campaignId: input.campaignId,
    userId: input.userId,
    name: input.name,
    speciesId: input.speciesId,
    classId: input.classId,
    subclassId: '',
    backgroundId: input.backgroundId,
    abilities: input.abilities,
    skillProficiencies: picked,
    saveProficiencies,
    hpCurrent: hpMax,
    hpMax,
    ac: armorClass({ abilities: input.abilities, unarmored: unarmoredAbility(input.classId) }),
    speed,
    attacks: spellAttack,
    spells: knownSpells,
    slots: spellSlotsForClass(input.classId, 1),
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    inventory: [],
    weaponMasteries: [],
    hitDie,
    hitDiceRemaining: 1,
    castingAbility: casting,
    classResources: resourcesForLevel(input.classId, 1),
    featureToggles: [],
    featIds: originFeat ? [originFeat] : [],
    pendingChoice: null,
  }).returning()
  return toCharacterDto(row)
}

const dmStatKeys = ['abilities', 'hpMax', 'hpCurrent', 'ac', 'speed', 'skillProficiencies', 'saveProficiencies', 'level', 'classId', 'subclassId', 'featIds', 'pendingChoice'] as const

export function sheetPatchForRole<T extends Record<string, unknown>>(role: CampaignRole, body: T) {
  if (role === 'dm')
    return body
  const next: Record<string, unknown> = { ...body }
  for (const key of dmStatKeys)
    delete next[key]
  return next as T
}

function asSlots(value: unknown): SpellSlot[] {
  if (!Array.isArray(value))
    return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object')
      return []
    const slot = item as SpellSlot
    if (typeof slot.level !== 'number' || typeof slot.max !== 'number')
      return []
    return [{ level: slot.level, max: slot.max, spent: typeof slot.spent === 'number' ? slot.spent : 0 }]
  })
}

function withSpellAttack(attacks: AttackDef[], scores: Abilities, casting: string | null, level: number) {
  if (!casting || !(abilities as readonly string[]).includes(casting))
    return attacks
  const ability = casting as Ability
  const bonus = abilityModifier(scores[ability]) + proficiencyBonus(level)
  return attacks.map(attack => attack.id === 'spell' ? { ...attack, attackBonus: bonus } : attack)
}

export async function levelUpCharacter(row: CharacterRow) {
  if (row.level >= 20)
    return null
  if (pendingOf(row.pendingChoice) || pendingSubclassOf(row))
    return null
  const nextLevel = row.level + 1
  const scores = asAbilities(row.abilities)
  const gain = hitPointsOnLevelUp(row.hitDie, scores.con)
  const hpMax = row.hpMax + gain
  const hpCurrent = row.hpCurrent + gain
  const gear = gearFields({ abilities: scores, classId: row.classId, level: nextLevel, attacks: asAttacks(row.attacks) }, row.inventory)
  const pendingChoice = pendingOf(row.pendingChoice) ?? choiceAtLevel(row.classId, nextLevel)
  const [updated] = await db.update(characters).set({
    level: nextLevel,
    hpMax,
    hpCurrent,
    hitDiceRemaining: Math.min(nextLevel, row.hitDiceRemaining + 1),
    slots: carrySpellSlots(asSlots(row.slots), spellSlotsForClass(row.classId, nextLevel)),
    ac: gear.ac,
    attacks: withSpellAttack(gear.attacks, scores, row.castingAbility, nextLevel),
    inventory: gear.inventory,
    classResources: resourcesForLevel(row.classId, nextLevel, asResources(row.classResources)),
    pendingChoice,
  }).where(eq(characters.id, row.id)).returning()
  await mirrorSheetHp(row.id, hpCurrent, hpMax)
  return updated
}

export async function resolveCharacterChoice(row: CharacterRow, body: {
  kind: PendingChoice
  bonuses?: Partial<Abilities>
  subclassId?: string
  featId?: string
}) {
  const pending = pendingOf(row.pendingChoice) ?? pendingSubclassOf(row)
  if (!pending)
    return null
  if (body.kind === 'subclass') {
    if (pending !== 'subclass' || !body.subclassId)
      return null
    const id = body.subclassId.startsWith('subclass-') ? body.subclassId : `subclass-${body.subclassId}`
    const entry = srdById(id)
    if (entry?.kind !== 'subclass' || entry.body.classId !== row.classId.replace(/^class-/, ''))
      return null
    const [updated] = await db.update(characters).set({ subclassId: id, pendingChoice: null }).where(eq(characters.id, row.id)).returning()
    return updated
  }
  if (body.kind === 'feat') {
    if (pending !== 'feat' && pending !== 'asi')
      return null
    if (!body.featId)
      return null
    const id = body.featId.startsWith('feat-') ? body.featId : `feat-${body.featId}`
    const feat = srdById(id)
    if (feat?.kind !== 'feat')
      return null
    if (pending === 'asi' && feat.body.category === 'epic-boon')
      return null
    const featIds = [...new Set([...asIdList(row.featIds), id])]
    const [updated] = await db.update(characters).set({ featIds, pendingChoice: null }).where(eq(characters.id, row.id)).returning()
    return updated
  }
  if (pending !== 'asi' || !body.bonuses)
    return null
  const scores = asAbilities(row.abilities)
  const next = { ...scores }
  let total = 0
  for (const key of abilities) {
    const bonus = body.bonuses[key] ?? 0
    if (!Number.isInteger(bonus) || bonus < 0 || bonus > 2)
      return null
    total += bonus
    next[key] = scores[key] + bonus
    if (next[key] > 20 || next[key] < 1)
      return null
  }
  if (total !== 2)
    return null
  const sheet = abilitySheet({ ...row, abilities: next }, next)
  const [updated] = await db.update(characters).set({
    abilities: next,
    ac: sheet.ac,
    attacks: sheet.attacks,
    inventory: sheet.inventory,
    pendingChoice: null,
  }).where(eq(characters.id, row.id)).returning()
  return updated
}

export async function mirrorSheetHp(characterId: string, hpCurrent: number, hpMax: number) {
  const placed = await db.update(tokens).set({ hpCurrent, hpMax }).where(eq(tokens.characterId, characterId)).returning({ id: tokens.id })
  const ids = placed.map(item => item.id)
  if (ids.length === 0)
    return
  await db.update(combatants).set({ hpCurrent, hpMax }).where(inArray(combatants.tokenId, ids))
}

export function abilitySheet(row: CharacterRow, scores: Abilities) {
  const gear = gearFields({ abilities: scores, classId: row.classId, level: row.level, attacks: asAttacks(row.attacks) }, row.inventory)
  return {
    abilities: scores,
    ac: gear.ac,
    attacks: withSpellAttack(gear.attacks, scores, row.castingAbility, row.level),
    inventory: gear.inventory,
  }
}

type PresetRow = typeof creaturePresets.$inferSelect

export function toPresetDto(row: PresetRow): CreaturePresetDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    ac: row.ac,
    hp: row.hp,
    speed: row.speed,
    attacks: asAttacks(row.attacks),
    abilities: asAbilities(row.abilities),
    saves: readSaveOverrides(row.saves),
    color: row.color,
  }
}

export async function listPresets(campaignId: string) {
  const rows = await db.select().from(creaturePresets).where(eq(creaturePresets.campaignId, campaignId))
  return rows.map(toPresetDto)
}

async function normalizeMobs(campaignId: string) {
  await bakeCatalogTokens(campaignId)
  await promoteCustomMobs(campaignId)
}

async function bakeCatalogTokens(campaignId: string) {
  const sceneRows = await db.select({ id: scenes.id }).from(scenes).where(eq(scenes.campaignId, campaignId))
  if (sceneRows.length === 0)
    return
  const rows = await db.select().from(tokens).where(inArray(tokens.sceneId, sceneRows.map(scene => scene.id)))
  for (const row of rows) {
    if (row.characterId || !row.monsterId)
      continue
    const entry = srd(row.monsterId)
    if (!entry)
      continue
    const stamp = catalogStamp(entry.body)
    const abilities = readAbilities(row.abilities)
    const patch = {
      ...(row.ac == null ? { ac: stamp.ac } : {}),
      ...(row.speed == null ? { speed: stamp.speed } : {}),
      ...(asAttacks(row.attacks).length === 0 ? { attacks: stamp.attacks } : {}),
      ...(!abilities ? { abilities: stamp.abilities, saves: stamp.saves } : {}),
      ...(readInventory(row.inventory).length === 0 && stamp.inventory.length > 0 ? { inventory: stamp.inventory } : {}),
    }
    if (Object.keys(patch).length === 0)
      continue
    await db.update(tokens).set(patch).where(eq(tokens.id, row.id))
  }
}

async function promoteCustomMobs(campaignId: string) {
  const customs = await db.select().from(characters).where(and(eq(characters.campaignId, campaignId), eq(characters.kind, 'custom')))
  if (customs.length === 0)
    return
  const sceneRows = await db.select({ id: scenes.id, active: scenes.active }).from(scenes).where(eq(scenes.campaignId, campaignId))
  const sceneIds = sceneRows.map(scene => scene.id)
  const board = sceneIds.length === 0
    ? []
    : await db.select().from(tokens).where(inArray(tokens.sceneId, sceneIds))
  const activeId = sceneRows.find(scene => scene.active)?.id ?? sceneRows[0]?.id
  for (const sheet of customs) {
    const gear = gearOfRow(sheet)
    const stamp = {
      name: sheet.name,
      hpCurrent: sheet.hpCurrent,
      hpMax: sheet.hpMax,
      characterId: null,
      ac: gear.ac,
      speed: sheet.speed,
      attacks: gear.attacks,
      abilities: asAbilities(sheet.abilities),
      inventory: gear.inventory,
    }
    const linked = board.filter(token => token.characterId === sheet.id)
    if (linked.length > 0) {
      for (const token of linked)
        await db.update(tokens).set(stamp).where(eq(tokens.id, token.id))
    }
    else if (activeId) {
      await db.insert(tokens).values({
        sceneId: activeId,
        x: 1,
        y: 1,
        hidden: false,
        color: '#5c4d7a',
        ...stamp,
      })
    }
    else {
      continue
    }
    await db.delete(characters).where(eq(characters.id, sheet.id))
  }
}

function catalogStamp(body: Record<string, unknown>) {
  return {
    ac: readArmorClass(body) ?? 10,
    speed: typeof body.speed === 'number' ? body.speed : 30,
    attacks: asAttacks(body.attacks),
    abilities: readAbilities(body.abilities) ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    saves: readSaveOverrides(body.saves),
    inventory: readInventory(body.inventory),
  }
}

export async function applyRest(characterId: string, kind: 'short' | 'long') {
  const [row] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1)
  if (!row)
    return null
  if (kind === 'long') {
    const slots = (Array.isArray(row.slots) ? row.slots : []) as CharacterDto['slots']
    const [updated] = await db.update(characters).set({
      hpCurrent: row.hpMax,
      hpTemp: 0,
      exhaustion: longRestExhaustion(row.exhaustion),
      hitDiceRemaining: Math.max(1, row.hitDiceRemaining + Math.max(1, Math.floor(row.level / 2))),
      slots: slots.map(slot => ({ ...slot, spent: 0 })),
      deathSaves: { successes: 0, failures: 0 },
      classResources: asResources(row.classResources).map(item => ({ ...item, spent: 0 })),
    }).where(eq(characters.id, characterId)).returning()
    return toCharacterDto(updated)
  }
  if (row.hitDiceRemaining <= 0)
    return toCharacterDto(row)
  const heal = hitDieHeal(hitDieSidesForClass(row.hitDie), asAbilities(row.abilities).con)
  const [updated] = await db.update(characters).set({
    hpCurrent: Math.min(row.hpMax, row.hpCurrent + heal),
    hitDiceRemaining: row.hitDiceRemaining - 1,
    classResources: asResources(row.classResources).map((item) => {
      if (item.recover === 'short')
        return { ...item, spent: 0 }
      if (item.recover === 'shortOne')
        return { ...item, spent: Math.max(0, item.spent - 1) }
      return item
    }),
  }).where(eq(characters.id, characterId)).returning()
  return toCharacterDto(updated)
}

export async function listScenes(campaignId: string, role: CampaignRole) {
  const rows = await db.select().from(scenes).where(eq(scenes.campaignId, campaignId))
  return rows.map(row => toSceneDto(row, role))
}

export async function listTokens(sceneIds: string[], role: CampaignRole) {
  if (sceneIds.length === 0)
    return []
  const rows = await db.select().from(tokens).where(inArray(tokens.sceneId, sceneIds))
  const visible = rows
    .filter(row => sceneIds.includes(row.sceneId))
    .filter(row => role === 'dm' || !row.hidden)
  const characterIds = [...new Set(visible.flatMap(row => row.characterId ? [row.characterId] : []))]
  const portraits = characterIds.length === 0
    ? []
    : await db.select({ id: characters.id, avatarPath: characters.avatarPath }).from(characters).where(inArray(characters.id, characterIds))
  const avatarByCharacter = new Map(portraits.map(row => [row.id, row.avatarPath]))
  return visible.map(row => toTokenDto(row, row.characterId ? avatarByCharacter.get(row.characterId) ?? null : null))
}

export async function loadCombat(sceneId: string, role: CampaignRole): Promise<CombatDto | null> {
  const [combat] = await db.select().from(combats).where(eq(combats.sceneId, sceneId)).limit(1)
  if (!combat)
    return null
  const rows = await db.select().from(combatants).where(eq(combatants.combatId, combat.id))
  const visible = rows
    .filter(row => role === 'dm' || !row.hidden)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return {
    id: combat.id,
    sceneId: combat.sceneId,
    round: combat.round,
    activeIndex: combat.activeIndex,
    combatants: visible.map(row => ({
      id: row.id,
      tokenId: row.tokenId,
      name: row.name,
      initiative: row.initiative,
      hpCurrent: row.hpCurrent,
      hpMax: row.hpMax,
      hidden: row.hidden,
      slotSpentThisTurn: row.slotSpentThisTurn,
    })),
  }
}

export async function listRolls(campaignId: string): Promise<DiceRollDto[]> {
  const rows = await db
    .select({ roll: diceRolls, displayName: users.displayName })
    .from(diceRolls)
    .innerJoin(users, eq(users.id, diceRolls.userId))
    .where(eq(diceRolls.campaignId, campaignId))
    .orderBy(desc(diceRolls.createdAt))
    .limit(40)
  return rows.map(({ roll, displayName }) => ({
    id: roll.id,
    campaignId: roll.campaignId,
    userId: roll.userId,
    displayName,
    label: roll.label,
    formula: roll.formula,
    mode: roll.mode as DiceRollDto['mode'],
    rolls: roll.rolls as number[],
    total: roll.total,
    createdAt: roll.createdAt.toISOString(),
  })).reverse()
}

function concealCombat(combat: CombatDto | null, concealment: { hidden: Set<string>, obscured: Set<string> }) {
  if (!combat)
    return null
  const activeId = combat.combatants[combat.activeIndex]?.id
  const combatants = combat.combatants.flatMap((combatant) => {
    if (combatant.tokenId && concealment.hidden.has(combatant.tokenId))
      return []
    if (combatant.tokenId && concealment.obscured.has(combatant.tokenId))
      return [{ ...combatant, name: 'Неизвестный', hpCurrent: 1, hpMax: 1 }]
    return [combatant]
  })
  return {
    ...combat,
    combatants,
    activeIndex: combatants.findIndex(combatant => combatant.id === activeId),
  }
}

export async function buildSnapshot(userId: string, campaignId: string): Promise<SnapshotDto | null> {
  const [member] = await db
    .select({ campaign: campaigns, role: campaignMembers.role })
    .from(campaignMembers)
    .innerJoin(campaigns, eq(campaigns.id, campaignMembers.campaignId))
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)))
    .limit(1)
  if (!member)
    return null
  await normalizeMobs(campaignId)
  const role = member.role
  const sceneRows = await listScenes(campaignId, role)
  const tokenRows = await listTokens(sceneRows.map(scene => scene.id), role)
  const active = sceneRows.find(scene => scene.active) ?? sceneRows[0] ?? null
  const sheetRows = await db.select().from(characters).where(eq(characters.campaignId, campaignId))
  const visibleSheets = role === 'dm' ? sheetRows : sheetRows.filter(row => row.kind !== 'custom')
  const concealment = role === 'dm'
    ? { hidden: new Set<string>(), obscured: new Set<string>() }
    : concealEnemies({
        tokens: tokenRows,
        fogByScene: new Map(sceneRows.map(scene => [scene.id, scene.fog])),
      })
  const tokens = tokenRows.flatMap((token) => {
    if (concealment.hidden.has(token.id))
      return []
    if (!concealment.obscured.has(token.id))
      return [token]
    return [{
      ...token,
      name: 'Неизвестный',
      monsterId: null,
      hpCurrent: 1,
      hpMax: 1,
      ac: null,
      speed: null,
      attacks: [],
      abilities: null,
      saves: null,
      inventory: [],
      imageUrl: null,
      color: '#2a2436',
      obscured: true,
    }]
  })
  const combat = active ? await loadCombat(active.id, role) : null
  return {
    campaign: {
      id: member.campaign.id,
      name: member.campaign.name,
      description: member.campaign.description,
      inviteCode: member.campaign.inviteCode,
      role,
      createdAt: member.campaign.createdAt.toISOString(),
    },
    scenes: sceneRows,
    tokens,
    combat: concealCombat(combat, concealment),
    rolls: await listRolls(campaignId),
    characters: visibleSheets.map(toCharacterDto),
    presets: await listPresets(campaignId),
  }
}

function rollCheck(bonus: number, mode: 'normal' | 'advantage' | 'disadvantage', exhaustion: number) {
  const rolled = rollD20({ bonus, mode, exhaustion })
  return { rolls: rolled.rolls, total: rolled.total }
}

function resolveRoll(read: { dice: DieTerm[], bonus: number, formula: string }, mode: DiceRollDto['mode'], exhaustion: number) {
  const term = read.dice[0]
  const singleD20 = term != null && read.dice.length === 1 && term.count === 1 && term.sides === 20 && term.sign === 1
  if (singleD20 && mode !== 'crit')
    return rollCheck(read.bonus, mode, exhaustion)
  if (mode === 'crit')
    return rollDamage(read.formula, true)
  return rollFormula(read.formula)
}

export async function recordRoll(input: {
  campaignId: string
  userId: string
  label: string
  formula: string
  mode: DiceRollDto['mode']
  exhaustion?: number
}) {
  const read = readDiceFormula(input.formula)
  if (!read)
    return null
  const result = resolveRoll(read, input.mode, input.exhaustion ?? 0)
  return saveRoll({
    campaignId: input.campaignId,
    userId: input.userId,
    label: input.label,
    formula: read.formula,
    mode: input.mode,
    rolls: result.rolls,
    total: result.total,
  })
}

export async function saveRoll(input: {
  campaignId: string
  userId: string
  label: string
  formula: string
  mode: DiceRollDto['mode']
  rolls: number[]
  total: number
}) {
  const [row] = await db.insert(diceRolls).values({
    campaignId: input.campaignId,
    userId: input.userId,
    label: input.label,
    formula: input.formula,
    mode: input.mode,
    rolls: input.rolls,
    total: input.total,
  }).returning()
  const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1)
  return {
    id: row.id,
    campaignId: row.campaignId,
    userId: row.userId,
    displayName: user?.displayName ?? '',
    label: row.label,
    formula: row.formula,
    mode: row.mode as DiceRollDto['mode'],
    rolls: input.rolls,
    total: input.total,
    createdAt: row.createdAt.toISOString(),
  } satisfies DiceRollDto
}

export async function ensureDemoUsers() {
  const demo = [
    { email: 'dm@table.local', displayName: 'Мастер' },
    { email: 'player@table.local', displayName: 'Игрок' },
  ]
  for (const person of demo) {
    const [found] = await db.select().from(users).where(eq(users.email, person.email)).limit(1)
    if (found)
      continue
    await db.insert(users).values({
      email: person.email,
      displayName: person.displayName,
      passwordHash: await hashPassword('password123'),
    })
  }
}

export async function ensureSrd() {
  await db.insert(srdEntries).values(srdCatalog.map(entry => ({
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    body: entry.body,
  }))).onConflictDoUpdate({
    target: srdEntries.id,
    set: {
      kind: sql`excluded.kind`,
      name: sql`excluded.name`,
      body: sql`excluded.body`,
    },
  })
  await db.delete(srdEntries).where(notInArray(srdEntries.id, srdCatalog.map(entry => entry.id)))
}

export function deadIfExhausted(level: number) {
  return isDeadFromExhaustion(level)
}
