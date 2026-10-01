import { z } from 'zod'
import { itemKinds, skills } from './types'

export const abilitySchema = z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha'])
export const skillSchema = z.enum(skills)
export const itemKindSchema = z.enum(itemKinds)

export const inventoryItemSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  name: z.string(),
  quantity: z.number().int(),
  kind: itemKindSchema,
  equipped: z.boolean(),
})

export const skillListSchema = z.array(skillSchema).refine(
  list => new Set(list).size === list.length,
  'Навыки без повторов',
)

export const saveListSchema = z.array(abilitySchema).refine(
  list => new Set(list).size === list.length,
  'Спасброски без повторов',
)

export const saveOverridesSchema = z.object({
  str: z.number().int().optional(),
  dex: z.number().int().optional(),
  con: z.number().int().optional(),
  int: z.number().int().optional(),
  wis: z.number().int().optional(),
  cha: z.number().int().optional(),
})

export const abilitiesSchema = z.object({
  str: z.number().int().min(1).max(30),
  dex: z.number().int().min(1).max(30),
  con: z.number().int().min(1).max(30),
  int: z.number().int().min(1).max(30),
  wis: z.number().int().min(1).max(30),
  cha: z.number().int().min(1).max(30),
})

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
})

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  createdAt: z.string(),
})

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
})

export const meResponseSchema = z.object({ user: userSchema })

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
})

export const campaignSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  inviteCode: z.string(),
  role: z.enum(['dm', 'player']),
  createdAt: z.string(),
})

export const attackSchema = z.object({
  id: z.string(),
  name: z.string(),
  attackBonus: z.number(),
  damageDice: z.string(),
  damageBonus: z.number(),
  damageType: z.string(),
  extraDice: z.string().optional(),
  range: z.string().optional(),
})

export const spellSlotSchema = z.object({
  level: z.number().int().min(1).max(9),
  max: z.number().int().min(0),
  spent: z.number().int().min(0),
})

export const knownSpellSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().int().min(0).max(9),
})

export const characterSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  speciesId: z.string(),
  classId: z.string(),
  subclassId: z.string(),
  backgroundId: z.string(),
  level: z.number().int().min(1).max(20),
  abilities: abilitiesSchema,
  skillProficiencies: skillListSchema,
  saveProficiencies: saveListSchema,
  hpCurrent: z.number().int(),
  hpMax: z.number().int(),
  hpTemp: z.number().int(),
  ac: z.number().int(),
  speed: z.number().int(),
  attacks: z.array(attackSchema),
  spells: z.array(knownSpellSchema),
  slots: z.array(spellSlotSchema),
  conditions: z.array(z.string()),
  heroicInspiration: z.boolean(),
  exhaustion: z.number().int().min(0).max(10),
  deathSaves: z.object({
    successes: z.number().int().min(0).max(3),
    failures: z.number().int().min(0).max(3),
  }),
  inventory: z.array(inventoryItemSchema),
  weaponMasteries: z.array(z.string()),
  hitDie: z.string(),
  hitDiceRemaining: z.number().int(),
  castingAbility: abilitySchema.nullable(),
  notes: z.string(),
  avatarUrl: z.string().nullable(),
})

export const createCharacterSchema = z.object({
  name: z.string().min(1).max(80),
  speciesId: z.string().min(1),
  classId: z.string().min(1),
  backgroundId: z.string().min(1),
  abilities: abilitiesSchema,
  skillProficiencies: skillListSchema,
})

export const updateCharacterSchema = characterSchema.omit({
  id: true,
  campaignId: true,
  userId: true,
  avatarUrl: true,
}).partial()

export const restSchema = z.object({
  kind: z.enum(['short', 'long']),
})

export const strikeRequestSchema = z.object({
  type: z.literal('strike'),
  attack: attackSchema,
  attackerTokenId: z.uuid(),
  targetTokenId: z.uuid(),
})

export const rollRequestSchema = z.object({
  label: z.string().min(1).max(120),
  formula: z.string().min(1).max(80),
  mode: z.enum(['normal', 'advantage', 'disadvantage', 'crit']).default('normal'),
  exhaustion: z.number().int().min(0).max(10).optional(),
})

export const diceRollSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  userId: z.uuid(),
  displayName: z.string(),
  label: z.string(),
  formula: z.string(),
  mode: z.enum(['normal', 'advantage', 'disadvantage', 'crit']),
  rolls: z.array(z.number()),
  total: z.number(),
  createdAt: z.string(),
})

export const gridSchema = z.object({
  columns: z.number().int().min(1).max(200),
  rows: z.number().int().min(1).max(200),
  cellSize: z.number().min(8).max(256),
})

export const fogPolygonSchema = z.object({
  id: z.string(),
  points: z.array(z.number()).min(6),
})

export const sceneSchema = z.object({
  id: z.uuid(),
  campaignId: z.uuid(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  grid: gridSchema,
  fog: z.array(fogPolygonSchema),
  dmNotes: z.string().optional(),
  active: z.boolean(),
})

export const createSceneSchema = z.object({
  name: z.string().min(1).max(120),
})

export const updateSceneSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  grid: gridSchema.optional(),
  fog: z.array(fogPolygonSchema).optional(),
  dmNotes: z.string().max(20000).optional(),
  active: z.boolean().optional(),
})

export const tokenSchema = z.object({
  id: z.uuid(),
  sceneId: z.uuid(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  size: z.number(),
  hpCurrent: z.number().int(),
  hpMax: z.number().int(),
  hidden: z.boolean(),
  characterId: z.uuid().nullable(),
  monsterId: z.string().nullable(),
  color: z.string(),
  ac: z.number().int().nullable(),
  speed: z.number().int().nullable(),
  attacks: z.array(attackSchema),
  abilities: abilitiesSchema.nullable(),
  saves: saveOverridesSchema.nullable(),
  inventory: z.array(inventoryItemSchema),
  imageUrl: z.string().nullable(),
  obscured: z.boolean(),
})

export const createTokenSchema = z.object({
  name: z.string().min(1),
  x: z.number().default(1),
  y: z.number().default(1),
  size: z.number().default(1),
  hpCurrent: z.number().int().default(1),
  hpMax: z.number().int().default(1),
  hidden: z.boolean().default(false),
  characterId: z.uuid().nullable().optional(),
  monsterId: z.string().nullable().optional(),
  color: z.string().default('#5c4d7a'),
  ac: z.number().int().min(0).max(40).nullable().optional(),
  speed: z.number().int().min(0).max(200).nullable().optional(),
  attacks: z.array(attackSchema).max(8).optional(),
  abilities: abilitiesSchema.nullable().optional(),
  saves: saveOverridesSchema.nullable().optional(),
})

export const updateTokenSchema = z.object({
  name: z.string().min(1).max(80),
  hpMax: z.number().int().min(1).max(999),
  ac: z.number().int().min(0).max(40),
  speed: z.number().int().min(0).max(200),
  attacks: z.array(attackSchema).max(12),
  abilities: abilitiesSchema.nullable(),
  saves: saveOverridesSchema.nullable(),
  inventory: z.array(inventoryItemSchema).max(40),
})

export const moveTokenSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const hpSchema = z.object({
  delta: z.number().int(),
})

export const combatantSchema = z.object({
  id: z.uuid(),
  tokenId: z.uuid().nullable(),
  name: z.string(),
  initiative: z.number(),
  hpCurrent: z.number().int(),
  hpMax: z.number().int(),
  hidden: z.boolean(),
  slotSpentThisTurn: z.boolean(),
})

export const combatSchema = z.object({
  id: z.uuid(),
  sceneId: z.uuid(),
  round: z.number().int(),
  activeIndex: z.number().int(),
  combatants: z.array(combatantSchema),
})

export const srdEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(['class', 'species', 'background', 'feat', 'spell', 'monster', 'item']),
  name: z.string(),
  body: z.record(z.string(), z.unknown()),
})

export const snapshotSchema = z.object({
  campaign: campaignSchema,
  scenes: z.array(sceneSchema),
  tokens: z.array(tokenSchema),
  combat: combatSchema.nullable(),
  rolls: z.array(diceRollSchema),
  characters: z.array(characterSchema),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UserDto = z.infer<typeof userSchema>
export type CampaignDto = z.infer<typeof campaignSchema>
export type CharacterDto = z.infer<typeof characterSchema>
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>
export type DiceRollDto = z.infer<typeof diceRollSchema>
export type SceneDto = z.infer<typeof sceneSchema>
export type TokenDto = z.infer<typeof tokenSchema>
export type CombatDto = z.infer<typeof combatSchema>
export type SnapshotDto = z.infer<typeof snapshotSchema>
export type SrdEntryDto = z.infer<typeof srdEntrySchema>
