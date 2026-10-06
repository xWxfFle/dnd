import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const campaignRoleEnum = pgEnum('campaign_role', ['dm', 'player'])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  inviteCode: text('invite_code').notNull().unique(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const campaignMembers = pgTable('campaign_members', {
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: campaignRoleEnum('role').notNull(),
}, t => [primaryKey({ columns: [t.campaignId, t.userId] })])

export const srdEntries = pgTable('srd_entries', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  body: jsonb('body').notNull(),
})

export const characters = pgTable('characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  speciesId: text('species_id').notNull(),
  classId: text('class_id').notNull(),
  subclassId: text('subclass_id').notNull(),
  backgroundId: text('background_id').notNull(),
  level: integer('level').notNull().default(1),
  abilities: jsonb('abilities').notNull(),
  skillProficiencies: jsonb('skill_proficiencies').notNull().default([]),
  saveProficiencies: jsonb('save_proficiencies').notNull().default([]),
  hpCurrent: integer('hp_current').notNull(),
  hpMax: integer('hp_max').notNull(),
  hpTemp: integer('hp_temp').notNull().default(0),
  ac: integer('ac').notNull(),
  speed: integer('speed').notNull(),
  attacks: jsonb('attacks').notNull().default([]),
  spells: jsonb('spells').notNull().default([]),
  slots: jsonb('slots').notNull().default([]),
  conditions: jsonb('conditions').notNull().default([]),
  heroicInspiration: boolean('heroic_inspiration').notNull().default(false),
  exhaustion: integer('exhaustion').notNull().default(0),
  deathSaves: jsonb('death_saves').notNull(),
  inventory: jsonb('inventory').notNull().default([]),
  weaponMasteries: jsonb('weapon_masteries').notNull().default([]),
  hitDie: text('hit_die').notNull(),
  hitDiceRemaining: integer('hit_dice_remaining').notNull(),
  castingAbility: text('casting_ability'),
  notes: text('notes').notNull().default(''),
  avatarPath: text('avatar_path'),
  kind: text('kind').notNull().default('hero'),
  classResources: jsonb('class_resources').notNull().default([]),
  featureToggles: jsonb('feature_toggles').notNull().default([]),
  featIds: jsonb('feat_ids').notNull().default([]),
  pendingChoice: text('pending_choice'),
})

export const creaturePresets = pgTable('creature_presets', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ac: integer('ac').notNull(),
  hp: integer('hp').notNull(),
  speed: integer('speed').notNull(),
  attacks: jsonb('attacks').notNull().default([]),
  abilities: jsonb('abilities').notNull(),
  saves: jsonb('saves').notNull().default({}),
  color: text('color').notNull().default('#5c4d7a'),
})

export const scenes = pgTable('scenes', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  imagePath: text('image_path'),
  grid: jsonb('grid').notNull(),
  fog: jsonb('fog').notNull().default([]),
  dmNotes: text('dm_notes').notNull().default(''),
  active: boolean('active').notNull().default(false),
})

export const tokens = pgTable('tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  x: real('x').notNull().default(1),
  y: real('y').notNull().default(1),
  size: real('size').notNull().default(1),
  hpCurrent: integer('hp_current').notNull(),
  hpMax: integer('hp_max').notNull(),
  hidden: boolean('hidden').notNull().default(false),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  monsterId: text('monster_id'),
  color: text('color').notNull().default('#5c4d7a'),
  ac: integer('ac'),
  speed: integer('speed'),
  attacks: jsonb('attacks').notNull().default([]),
  abilities: jsonb('abilities'),
  saves: jsonb('saves'),
  inventory: jsonb('inventory').notNull().default([]),
  imagePath: text('image_path'),
})

export const combats = pgTable('combats', {
  id: uuid('id').defaultRandom().primaryKey(),
  sceneId: uuid('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  round: integer('round').notNull().default(1),
  activeIndex: integer('active_index').notNull().default(0),
})

export const combatants = pgTable('combatants', {
  id: uuid('id').defaultRandom().primaryKey(),
  combatId: uuid('combat_id').notNull().references(() => combats.id, { onDelete: 'cascade' }),
  tokenId: uuid('token_id').references(() => tokens.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  initiative: integer('initiative').notNull(),
  hpCurrent: integer('hp_current').notNull(),
  hpMax: integer('hp_max').notNull(),
  hidden: boolean('hidden').notNull().default(false),
  slotSpentThisTurn: boolean('slot_spent_this_turn').notNull().default(false),
  sortOrder: integer('sort_order').notNull(),
})

export const diceRolls = pgTable('dice_rolls', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  label: text('label').notNull(),
  formula: text('formula').notNull(),
  mode: text('mode').notNull(),
  rolls: jsonb('rolls').notNull(),
  total: integer('total').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(campaignMembers),
}))
