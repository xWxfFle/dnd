import type { ClassResource, ResourceRecover, Skill } from './types'
import { readGearBody } from './rules'
import { acceptSkillChoiceFromKit, featuresFromKit, readClassTables, skillChoiceFromKit } from './sheet-kit'
import backgroundRows from './srd-2024-backgrounds.json'
import classRows from './srd-2024-classes.json'
import featRows from './srd-2024-feats.json'
import itemRows from './srd-2024-items.json'
import subclassRows from './srd-2024-subclasses.json'
import { skills } from './types'

export interface SrdSeed {
  id: string
  kind: 'class' | 'subclass' | 'species' | 'background' | 'feat' | 'spell' | 'monster' | 'item'
  name: string
  body: Record<string, unknown>
}

export const srdCatalog: SrdSeed[] = []

const recoverByTable: Record<string, ResourceRecover> = {
  'rages': 'shortOne',
  'focus-points': 'short',
  'monks-focus': 'short',
  'sorcery-points': 'long',
  'channel-divinity': 'short',
  'wild-shape': 'short',
  'wild-shape-uses': 'short',
  'bardic-inspiration': 'long',
}

const skipResource = /damage|die|bonus|mastery|cantrip|prepared|known|invocations|slot/

export function srdById(id: string) {
  return srdCatalog.find(entry => entry.id === id) ?? null
}

export function skillOfferForClass(classId: string) {
  const entry = srdById(classId)
  if (!entry || entry.kind !== 'class')
    return null
  const skillChoices = Number(entry.body.skillChoices ?? 0)
  const list = Array.isArray(entry.body.skills) ? entry.body.skills.filter(isSkill) : [...skills]
  if (skillChoices < 1)
    return null
  return { skillChoices, skills: list.length > 0 ? list : [...skills] }
}

export { readClassFeatures, readClassTables } from './sheet-kit'

export function featuresForSheet(classId: string, subclassId: string, level: number) {
  return featuresFromKit(srdCatalog, classId, subclassId, level)
}

export function resourcesForLevel(classId: string, level: number, previous: ClassResource[] = []): ClassResource[] {
  const klass = srdById(classId)
  if (!klass)
    return previous
  const spentById = new Map(previous.map(item => [item.id, item.spent]))
  return readClassTables(klass.body).flatMap((table) => {
    if (skipResource.test(table.id))
      return []
    const raw = table.values[String(level)]
    if (!raw || !/^\d+$/.test(raw))
      return []
    const max = Number(raw)
    const spent = Math.min(spentById.get(table.id) ?? 0, max)
    return [{
      id: table.id,
      name: table.name,
      max,
      spent,
      recover: recoverByTable[table.id] ?? 'long',
    }]
  })
}

export function unarmoredAbility(classId: string): 'con' | 'wis' | null {
  const value = srdById(classId)?.body.unarmored
  if (value === 'con' || value === 'wis')
    return value
  return null
}

export function subclassLevelOf(classId: string) {
  const value = srdById(classId)?.body.subclassLevel
  return typeof value === 'number' ? value : 3
}

export function asiLevelsOf(classId: string) {
  const list = srdById(classId)?.body.asiLevels
  if (!Array.isArray(list))
    return [4, 8, 12, 16, 19]
  return list.filter((item): item is number => typeof item === 'number')
}

export function subclassesForClass(classId: string) {
  const id = classId.replace(/^class-/, '')
  return srdCatalog.filter(entry => entry.kind === 'subclass' && entry.body.classId === id)
}

export function isSubclassChosen(subclassId: string) {
  if (!subclassId)
    return false
  const id = subclassId.startsWith('subclass-') ? subclassId : `subclass-${subclassId}`
  return srdById(id)?.kind === 'subclass'
}

export function readSpellIds(body: Record<string, unknown>) {
  if (!Array.isArray(body.spellIds))
    return []
  return body.spellIds.filter((id): id is string => typeof id === 'string')
}

const classes: SrdSeed[] = classRows.map(row => ({
  id: `class-${row.id}`,
  kind: 'class' as const,
  name: row.name,
  body: {
    hitDie: row.hitDie,
    saves: row.saves,
    casting: row.casting,
    unarmored: row.unarmored,
    weaponMastery: row.weaponMastery,
    skillChoices: row.skillChoices,
    skills: row.skills,
    spellIds: row.spellIds,
    subclassLevel: row.subclassLevel,
    asiLevels: row.asiLevels,
    traits: row.traits,
    features: row.features,
    tables: row.tables,
  },
}))

const subclasses: SrdSeed[] = subclassRows
  .map(row => ({
    id: `subclass-${row.id}`,
    kind: 'subclass' as const,
    name: row.name,
    body: {
      classId: row.classId,
      text: row.text,
      features: row.features,
    },
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'ru'))

const species: SrdSeed[] = [
  ['dragonborn', 'Драконорождённый', 30, 'Дыхание дракона, сопротивление урону предка.'],
  ['dwarf', 'Дварф', 30, 'Тёмное зрение, стойкость дварфов, знание камня.'],
  ['elf', 'Эльф', 30, 'Тёмное зрение, острое чутьё, транс.'],
  ['gnome', 'Гном', 30, 'Тёмное зрение, гномья хитрость.'],
  ['goliath', 'Голиаф', 35, 'Мощь великана.'],
  ['halfling', 'Полурослик', 30, 'Удача, храбрость, проворство.'],
  ['human', 'Человек', 30, 'Находчивость, дополнительная черта.'],
  ['orc', 'Орк', 30, 'Адреналин, тёмное зрение.'],
  ['tiefling', 'Тифлинг', 30, 'Потустороннее наследие, тёмное зрение.'],
].map(([id, name, speed, trait]) => ({
  id: `species-${id}`,
  kind: 'species' as const,
  name: String(name),
  body: { speed, trait },
}))

const backgrounds: SrdSeed[] = backgroundRows.map(row => ({
  id: `background-${row.id}`,
  kind: 'background' as const,
  name: row.name,
  body: {
    originFeatId: row.originFeatId,
    originFeatName: row.originFeatName,
    abilities: [...row.abilities],
    skills: [...row.skills],
    tools: row.tools,
    equipment: row.equipment,
    text: row.text,
  },
}))

const feats: SrdSeed[] = featRows.map(row => ({
  id: `feat-${row.id}`,
  kind: 'feat' as const,
  name: row.name,
  body: { category: row.category, text: row.text },
}))

const items: SrdSeed[] = itemRows.map(row => ({
  id: `item-${row.id}`,
  kind: 'item' as const,
  name: row.name,
  body: { ...(row.gear ?? { kind: 'gear' }), category: row.category, cost: row.cost, weight: row.weight, text: row.text },
}))

// Здесь только то, что нужно правилам листа и в интерфейсе. Заклинания, монстры и магические предметы лежат в srd-full.ts:
// интерфейс получает их через /api/srd, иначе они попадают в бандл.
srdCatalog.length = 0
srdCatalog.push(
  ...classes,
  ...subclasses,
  ...species,
  ...backgrounds,
  ...feats,
  ...items,
)

function isSkill(value: unknown): value is Skill {
  return typeof value === 'string' && (skills as readonly string[]).includes(value)
}

export function backgroundSkillGrant(backgroundId: string): Skill[] {
  const entry = srdById(backgroundId)
  const list = entry?.kind === 'background' ? entry.body.skills : null
  if (!Array.isArray(list))
    return []
  return list.filter(isSkill)
}

export function originFeatId(backgroundId: string) {
  const value = srdById(backgroundId)?.body.originFeatId
  return typeof value === 'string' ? value : null
}

export function skillChoiceForOrigin(classId: string, backgroundId: string) {
  return skillChoiceFromKit(srdCatalog, classId, backgroundId)
}

export function acceptSkillChoice(chosen: readonly Skill[], classId: string, backgroundId: string) {
  return acceptSkillChoiceFromKit(chosen, classId, backgroundId, srdCatalog)
}

export function gearByItemId(itemId: string) {
  const entry = srdCatalog.find(item => item.id === itemId)
  const stats = readGearBody(entry?.body)
  if (!entry || !stats)
    return null
  return { name: entry.name, stats }
}
