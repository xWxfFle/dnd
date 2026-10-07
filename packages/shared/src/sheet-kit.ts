import type { ClassFeature, ClassTable, Skill } from './types'
import { originSkillBonus } from './starting'
import { skills } from './types'

export interface KitEntry {
  id: string
  kind: string
  name?: string
  body: Record<string, unknown>
}

function isSkill(value: unknown): value is Skill {
  return typeof value === 'string' && (skills as readonly string[]).includes(value)
}

export function readClassFeatures(body: Record<string, unknown>): ClassFeature[] {
  if (!Array.isArray(body.features))
    return []
  return body.features.flatMap((item) => {
    if (!item || typeof item !== 'object')
      return []
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.text !== 'string')
      return []
    const feature: ClassFeature = {
      id: row.id,
      name: row.name,
      text: row.text,
      level: typeof row.level === 'number' ? row.level : 1,
      subclass: row.subclass === true || typeof row.subclassId === 'string',
    }
    if (typeof row.subclassId === 'string')
      feature.subclassId = row.subclassId
    if (typeof row.formula === 'string' && row.formula.length > 0)
      feature.formula = row.formula
    return [feature]
  })
}

export function readClassTables(body: Record<string, unknown>): ClassTable[] {
  if (!Array.isArray(body.tables))
    return []
  return body.tables.flatMap((item) => {
    if (!item || typeof item !== 'object')
      return []
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || typeof row.name !== 'string' || !row.values || typeof row.values !== 'object')
      return []
    const values: Record<string, string> = {}
    for (const [level, value] of Object.entries(row.values as Record<string, unknown>)) {
      if (typeof value === 'string')
        values[level] = value
    }
    return [{ id: row.id, name: row.name, values }]
  })
}

const formulaTableByFeature: Record<string, string> = {
  'bardic-inspiration': 'bardic-die',
  'second-wind': 'second-wind',
  'sneak-attack': 'sneak-attack',
  'martial-arts': 'martial-arts',
}

function scaledFormula(feature: ClassFeature, tables: ClassTable[], level: number) {
  if (feature.id === 'second-wind')
    return `1d10+${level}`
  const tableId = formulaTableByFeature[feature.id] ?? feature.id
  const table = tables.find(item => item.id === tableId || item.id === feature.id || item.id.replace(/-count$/, '') === feature.id)
  const value = table?.values[String(level)]
  if (value && /\d+d\d+/.test(value))
    return value.replace(/^\+/, '')
  if (feature.formula)
    return feature.formula.replace(/\blevel\b/gi, String(level))
  return undefined
}

function isMetaFeature(name: string) {
  return /подкласс|список заклинаний|увеличение характеристик|эпический дар|основные черты/i.test(name)
    || /subclass|spell list|ability score|epic boon|core .+ traits|spell slots|slot level/i.test(name)
}

function entryOf(kit: readonly KitEntry[], id: string) {
  return kit.find(entry => entry.id === id) ?? null
}

export function featuresFromKit(kit: readonly KitEntry[], classId: string, subclassId: string, level: number): ClassFeature[] {
  const klass = entryOf(kit, classId)
  if (!klass || klass.kind !== 'class')
    return []
  const tables = readClassTables(klass.body)
  const chosen = subclassId.startsWith('subclass-') ? subclassId : subclassId ? `subclass-${subclassId}` : ''
  const subclass = chosen ? entryOf(kit, chosen) : null
  const classFeatures = readClassFeatures(klass.body).map(feature => ({
    ...feature,
    formula: scaledFormula(feature, tables, level),
  }))
  const subFeatures = subclass?.kind === 'subclass'
    ? readClassFeatures(subclass.body).map(feature => ({
        ...feature,
        subclass: true,
        subclassId: subclass.id,
        formula: scaledFormula(feature, tables, level),
      }))
    : []
  return [...classFeatures, ...subFeatures]
    .filter(feature => feature.level <= level && !isMetaFeature(feature.name))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'))
}

export function featureIdsFromKit(kit: readonly KitEntry[], classId: string, subclassId: string, level: number) {
  return featuresFromKit(kit, classId, subclassId, level).map(feature => feature.id)
}

export function originFeatFromKit(kit: readonly KitEntry[], backgroundId: string) {
  const value = entryOf(kit, backgroundId)?.body.originFeatId
  return typeof value === 'string' ? value : null
}

export function backgroundAbilitiesFromKit(kit: readonly KitEntry[], backgroundId: string) {
  const list = entryOf(kit, backgroundId)?.body.abilities
  if (!Array.isArray(list))
    return []
  return list.filter((item): item is string => typeof item === 'string')
}

export function classMasteryFromKit(kit: readonly KitEntry[], classId: string) {
  return entryOf(kit, classId)?.body.weaponMastery === true
}

export function skillChoiceFromKit(kit: readonly KitEntry[], classId: string, backgroundId: string) {
  const klass = entryOf(kit, classId)
  if (!klass || klass.kind !== 'class')
    return null
  const skillChoices = Number(klass.body.skillChoices ?? 0)
  const list = Array.isArray(klass.body.skills) ? klass.body.skills.filter(isSkill) : [...skills]
  if (skillChoices < 1)
    return null
  const background = entryOf(kit, backgroundId)
  const granted = Array.isArray(background?.body.skills) ? background.body.skills.filter(isSkill) : []
  const grantedSet = new Set<string>(granted)
  const extra = originSkillBonus(typeof background?.body.originFeatId === 'string' ? background.body.originFeatId : null)
  return {
    granted,
    skillChoices: skillChoices + extra,
    suggested: (list.length > 0 ? list : [...skills]).filter(skill => !grantedSet.has(skill)),
    skills: skills.filter(skill => !grantedSet.has(skill)),
  }
}

export function acceptSkillChoiceFromKit(chosen: readonly Skill[], classId: string, backgroundId: string, kit: readonly KitEntry[]) {
  const choice = skillChoiceFromKit(kit, classId, backgroundId)
  if (!choice)
    return null
  const unique = new Set(chosen)
  if (unique.size !== chosen.length)
    return null
  for (const skill of choice.granted) {
    if (!unique.has(skill))
      return null
  }
  const picked = chosen.filter(skill => !choice.granted.includes(skill))
  if (picked.length !== choice.skillChoices)
    return null
  const offered = new Set(choice.skills)
  if (picked.some(skill => !offered.has(skill)))
    return null
  return [...choice.granted, ...picked]
}
