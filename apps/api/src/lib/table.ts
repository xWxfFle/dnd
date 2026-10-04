import type { Abilities, Ability, AttackDef, CampaignRole, CharacterDto, CombatDto, DiceRollDto, DieTerm, SceneDto, Skill, SnapshotDto, TokenDto } from '@dnd/shared'
import { statSync } from 'node:fs'
import {
  abilities,
  abilityModifier,
  acceptSkillChoice,
  armorClass,
  concealEnemies,
  equipmentSheet,
  gearByItemId,
  hitDieHeal,
  hitDieSidesForClass,
  isDeadFromExhaustion,
  longRestExhaustion,
  readAbilities,
  readDiceFormula,
  readInventory,
  readSaveOverrides,
  readSpellIds,
  rollD20,
  rollDamage,
  rollFormula,
  skills,
  srdCatalog,
} from '@dnd/shared'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../db'
import {
  campaignMembers,
  campaigns,
  characters,
  combatants,
  combats,
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

function gearOfRow(row: Pick<CharacterRow, 'abilities' | 'level' | 'inventory' | 'attacks'>) {
  return equipmentSheet({
    abilities: asAbilities(row.abilities),
    level: row.level,
    inventory: readInventory(row.inventory),
    attacks: asAttacks(row.attacks),
    gearOf: gearByItemId,
  })
}

export function armorFromCharacter(row: Pick<CharacterRow, 'abilities' | 'level' | 'inventory' | 'attacks'>) {
  return gearOfRow(row).ac
}

export function gearFields(row: Pick<CharacterRow, 'abilities' | 'level' | 'attacks'>, inventory: unknown) {
  const gear = gearOfRow({ ...row, inventory })
  return { inventory: gear.inventory, ac: gear.ac, attacks: gear.attacks }
}

const characterKindByValue: Record<string, 'hero' | 'custom' | undefined> = {
  custom: 'custom',
  hero: 'hero',
}

export function toCharacterDto(row: CharacterRow): CharacterDto {
  const gear = gearOfRow(row)
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
    avatarUrl: row.avatarPath ? `/api/characters/${row.id}/avatar` : null,
    kind: characterKindByValue[row.kind] ?? 'hero',
  }
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

export function monsterTokenScores(monsterId: string | null | undefined) {
  if (!monsterId)
    return null
  const entry = srd(monsterId)
  if (!entry)
    return null
  const abilities = readAbilities(entry.body.abilities)
  if (!abilities)
    return null
  return { abilities, saves: readSaveOverrides(entry.body.saves) }
}

function tokenScores(row: TokenRow) {
  const stored = readAbilities(row.abilities)
  if (stored)
    return { abilities: stored, saves: readSaveOverrides(row.saves) }
  const entry = row.monsterId ? srd(row.monsterId) : null
  const catalog = readAbilities(entry?.body.abilities)
  if (!catalog)
    return { abilities: null, saves: null }
  return { abilities: catalog, saves: readSaveOverrides(entry?.body.saves) }
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
  const picked = acceptSkillChoice(input.classId, input.backgroundId, input.skillProficiencies)
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
  const featId = String(background.body.originFeatId ?? '')
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
    .map(entry => ({
      id: entry.id,
      name: entry.name,
      level: Number(entry.body.level ?? 0),
    }))
  const [row] = await db.insert(characters).values({
    campaignId: input.campaignId,
    userId: input.userId,
    name: input.name,
    speciesId: input.speciesId,
    classId: input.classId,
    subclassId: String(classEntry.body.subclassId ?? input.classId),
    backgroundId: input.backgroundId,
    abilities: input.abilities,
    skillProficiencies: picked,
    saveProficiencies,
    hpCurrent: hpMax,
    hpMax,
    ac: armorClass({ abilities: input.abilities }),
    speed,
    attacks: spellAttack,
    spells: knownSpells,
    slots: casting ? [{ level: 1, max: 2, spent: 0 }] : [],
    conditions: [],
    deathSaves: { successes: 0, failures: 0 },
    inventory: featId
      ? [{ id: featId, itemId: featId, name: 'Черта происхождения', quantity: 1, kind: 'gear' as const, equipped: false }]
      : [],
    weaponMasteries: classEntry.body.weaponMastery ? ['отталкивание'] : [],
    hitDie,
    hitDiceRemaining: 1,
    castingAbility: casting,
  }).returning()
  return toCharacterDto(row)
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
    }).where(eq(characters.id, characterId)).returning()
    return toCharacterDto(updated)
  }
  if (row.hitDiceRemaining <= 0)
    return toCharacterDto(row)
  const heal = hitDieHeal(hitDieSidesForClass(row.hitDie), asAbilities(row.abilities).con)
  const [updated] = await db.update(characters).set({
    hpCurrent: Math.min(row.hpMax, row.hpCurrent + heal),
    hitDiceRemaining: row.hitDiceRemaining - 1,
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
}

export function deadIfExhausted(level: number) {
  return isDeadFromExhaustion(level)
}
