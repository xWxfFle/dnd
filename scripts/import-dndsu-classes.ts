/* eslint-disable style/quote-props */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { skills } from '../packages/shared/src/types'
import { decodeEntities, divContent, featureText, fetchPage, fixMixedWords, plainText, slugOf } from './dndsu-html'

const classUrl = 'https://next.dnd.su/class'
const outDir = path.resolve('packages/shared/src')

// Классы PHB 2024: слаг страницы dnd.su совпадает с id в каталоге.
const classSlugs = [
  'barbarian',
  'bard',
  'cleric',
  'druid',
  'fighter',
  'monk',
  'paladin',
  'ranger',
  'rogue',
  'sorcerer',
  'warlock',
  'wizard',
] as const

// Подклассы PHB 2024: data-code страницы -> id в каталоге. На сайте есть и подклассы других книг — их не берём.
const subclassIdByCode: Record<string, string> = {
  'berserker': 'path-of-the-berserker',
  'wild-heart': 'path-of-the-wild-heart',
  'world-tree': 'path-of-the-world-tree',
  'zealot': 'path-of-the-zealot',
  'lore': 'college-of-lore',
  'dance': 'college-of-dance',
  'glamour': 'college-of-glamour',
  'valor': 'college-of-valor',
  'life-domain': 'life-domain',
  'light-domain': 'light-domain',
  'trickery-domain': 'trickery-domain',
  'war-domain': 'war-domain',
  'land': 'circle-of-the-land',
  'moon': 'circle-of-the-moon',
  'sea': 'circle-of-the-sea',
  'stars': 'circle-of-the-stars',
  'champion': 'champion',
  'battlemaster': 'battle-master',
  'eldritch-knight': 'eldritch-knight',
  'psi-warrior': 'psi-warrior',
  'warrior-of-the-hand': 'warrior-of-the-open-hand',
  'warrior-of-mercy': 'warrior-of-mercy',
  'warrior-of-shadow': 'warrior-of-shadow',
  'warrior-of-the-elements': 'warrior-of-the-elements',
  'oath-of-devotion': 'oath-of-devotion',
  'oath-of-glory': 'oath-of-glory',
  'oath-of-the-ancients': 'oath-of-the-ancients',
  'oath-of-vengeance': 'oath-of-vengeance',
  'hunter-ranger': 'hunter',
  'beastmaster': 'beast-master',
  'fey-wanderer': 'fey-wanderer',
  'gloom-stalker': 'gloom-stalker',
  'thief': 'thief',
  'arcane-trickster': 'arcane-trickster',
  'assassin': 'assassin',
  'soulknife': 'soulknife',
  'draconic-sorcery': 'draconic-sorcery',
  'aberrant-sorcery': 'aberrant-sorcery',
  'clockwork-sorcery': 'clockwork-sorcery',
  'wild-magic-sorcery': 'wild-magic-sorcery',
  'fiend-patron': 'fiend-patron',
  'archfey': 'archfey-patron',
  'celestial-patron': 'celestial-patron',
  'greate-old-one-patron': 'great-old-one-patron',
  'evoker': 'evoker',
  'abjurer': 'abjurer',
  'diviner': 'diviner',
  'illusionist': 'illusionist',
}

// Колонки таблицы умений класса -> id таблицы в каталоге. Отсутствие ключа означает «колонку не сохраняем».
const tableIdByColumn: Record<string, string> = {
  'Бонус владения': 'proficiency-bonus',
  'Ярость': 'rages',
  'Урон ярости': 'rage-damage',
  'Оружейное мастерство': 'weapon-mastery-count',
  'Кость вдохновения': 'bardic-die',
  'Заговоры': 'cantrips',
  'Подготовленные заклинания': 'prepared-spells',
  'Проведение божественности': 'channel-divinity-uses',
  'Дикий облик': 'wild-shape-uses',
  'Второе дыхание': 'second-wind-uses',
  'Боевые искусства': 'martial-arts-dice',
  'Очки сосредоточенности': 'focus-points',
  'Движение без доспехов': 'unarmored-movement',
  'Избранный враг': 'favored-enemy-uses',
  'Коварная атака': 'sneak-attack-column-data',
  'Очки чародейства': 'sorcery-points',
  'Таинственные воззвания': 'eldritch-invocation-count',
  'Ячейки заклинаний': 'spell-slots',
  'Уровень ячеек': 'slot-level',
}

const abilityByRu: Record<string, string> = {
  'сила': 'str',
  'ловкость': 'dex',
  'телосложение': 'con',
  'интеллект': 'int',
  'мудрость': 'wis',
  'харизма': 'cha',
}

const skillByRu: Record<string, string> = {
  'акробатика': 'acrobatics',
  'обращение с животными': 'animal-handling',
  'уход за животными': 'animal-handling',
  'тайная магия': 'arcana',
  'магия': 'arcana',
  'атлетика': 'athletics',
  'обман': 'deception',
  'история': 'history',
  'проницательность': 'insight',
  'запугивание': 'intimidation',
  'расследование': 'investigation',
  'медицина': 'medicine',
  'природа': 'nature',
  'восприятие': 'perception',
  'выступление': 'performance',
  'убеждение': 'persuasion',
  'религия': 'religion',
  'ловкость рук': 'sleight-of-hand',
  'скрытность': 'stealth',
  'выживание': 'survival',
}

const countByWord: Record<string, number> = {
  'один': 1,
  'одного': 1,
  'два': 2,
  'две': 2,
  'три': 3,
  'четыре': 4,
  'пять': 5,
}

// Кириллические двойники латиницы встречаются в data-code страниц (subclass.сhampion и подобные).
const latinByCyrillic: Record<string, string> = {
  'а': 'a',
  'в': 'b',
  'е': 'e',
  'к': 'k',
  'м': 'm',
  'н': 'h',
  'о': 'o',
  'р': 'p',
  'с': 'c',
  'т': 't',
  'у': 'y',
  'х': 'x',
}

interface FeatureRow {
  id: string
  name: string
  text: string
  level: number
}

interface TableRow {
  id: string
  name: string
  values: Record<string, string>
}

interface TraitRow {
  caption: string
  text: string
}

interface ClassRow {
  id: string
  name: string
  hitDie: string
  saves: string[]
  casting: string | null
  unarmored: string | null
  weaponMastery: boolean
  skillChoices: number
  skills: string[]
  spellIds: string[]
  subclassLevel: number
  asiLevels: number[]
  traits: TraitRow[]
  features: FeatureRow[]
  tables: TableRow[]
}

interface SubclassRow {
  id: string
  classId: string
  name: string
  text: string
  features: FeatureRow[]
}

function toLatin(value: string) {
  return value.toLowerCase().replace(/\p{Script=Cyrillic}/gu, char => latinByCyrillic[char] ?? char)
}

function parseTraits(html: string): TraitRow[] {
  const pattern = /<div class="class__core_traits__caption">([\s\S]*?)<\/div>\s*<div class="class__core_traits__text">([\s\S]*?)<\/div>/g
  return [...html.matchAll(pattern)].map(match => ({
    caption: plainText(match[1]),
    text: featureText(match[2]).replace(/\n+/g, ' ').trim(),
  }))
}

function traitValue(traits: TraitRow[], caption: string) {
  return traits.find(trait => trait.caption.toLowerCase().startsWith(caption.toLowerCase()))?.text ?? ''
}

function hitDieOf(traits: TraitRow[]) {
  const match = /[кk](\d+)/i.exec(toLatin(traitValue(traits, 'Кость хитов')))
  return match ? `d${match[1]}` : ''
}

function savesOf(traits: TraitRow[]) {
  const text = traitValue(traits, 'Владение спасбросками').toLowerCase()
  return text
    .split(/\s+и\s+|,\s*/)
    .map(part => abilityByRu[part.trim()])
    .filter((value): value is string => Boolean(value))
}

function skillOfferOf(traits: TraitRow[]) {
  const text = traitValue(traits, 'Владение навыками')
  const count = countByWord[/выберите\s+(\p{Script=Cyrillic}+)/iu.exec(text)?.[1].toLowerCase() ?? ''] ?? 0
  if (/любых навыка|любой навык|любых навыков/i.test(text))
    return { skillChoices: count, skills: [...skills] as string[] }
  const listed = (text.split(':')[1] ?? '')
    .split(/,\s*|\s+или\s+/)
    .map(part => skillByRu[part.trim().toLowerCase().replace(/\.$/, '')])
    .filter((value): value is string => Boolean(value))
  return { skillChoices: count, skills: [...new Set(listed)].sort() }
}

function featureChunks(html: string, marker: string) {
  return html.split(marker).slice(1)
}

// Тело класса кончается перед блоком сравнения подклассов: дальше идут комментарии и подвал страницы.
function classBody(html: string) {
  const index = html.indexOf('caption="Сравнение подклассов"')
  if (index < 0)
    return html
  const divStart = html.lastIndexOf('<div', index)
  return html.slice(0, divStart > 0 ? divStart : index)
}

function attrsOf(chunk: string) {
  return chunk.slice(0, chunk.indexOf('>'))
}

function levelOf(chunk: string) {
  return Number(/data-level="(\d+)"/.exec(attrsOf(chunk))?.[1] ?? '')
}

function readFeature(chunk: string, usedIds: Set<string>): FeatureRow | null {
  const attrs = attrsOf(chunk)
  const level = levelOf(chunk)
  const name = fixMixedWords(decodeEntities(/data-title="([^"]*)"/.exec(attrs)?.[1] ?? ''))
  const block = divContent(chunk)
  const english = /<h3[^>]*title="([^"]*)"/.exec(block)?.[1] ?? ''
  const code = toLatin(/data-code="([^"]*)"/.exec(attrs)?.[1] ?? '').replace(/^feature\./, '')
  const base = slugOf(english) || slugOf(code.split('.').pop() ?? '')
  if (!base || !name || !Number.isFinite(level))
    return null
  const id = usedIds.has(base) ? `${base}-${level}` : base
  usedIds.add(id)
  return { id, name, text: featureText(block.replace(/<h3[\s\S]*?<\/h3>/, '')), level }
}

function parseClassFeatures(html: string) {
  const usedIds = new Set<string>()
  const rows: FeatureRow[] = []
  for (const chunk of featureChunks(html, '<div class="class__feature')) {
    // Плейсхолдеры «Умение подкласса» только отмечают место в прогрессии и своего текста не несут.
    if (chunk.startsWith(' class__feature_subclass_place'))
      continue
    const feature = readFeature(chunk, usedIds)
    if (feature)
      rows.push(feature)
  }
  return rows.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'))
}

function parseTables(html: string): TableRow[] {
  const table = /<table[^>]*id='class-features'[^>]*>([\s\S]*?)<\/table>/.exec(html)?.[1]
  if (!table)
    return []
  const rows = [...table.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)]
  const header = rows.find(row => /table_header/.test(row[1]) && !/spell-slots-row/.test(row[1]))
  if (!header)
    return []
  const columns: Array<{ name: string, index: number }> = []
  let index = 0
  for (const cell of header[2].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)) {
    const span = Number(/colspan='?(\d+)'?/.exec(cell[1])?.[1] ?? 1)
    const long = /<span class='long'>([\s\S]*?)<\/span>/.exec(cell[2])?.[1]
    columns.push({ name: plainText(long ?? cell[2].replace(/<span class='short'[\s\S]*?<\/span>/g, '')), index })
    index += span
  }
  const values = new Map<string, Record<string, string>>()
  for (const row of rows) {
    if (/table_header/.test(row[1]))
      continue
    const cells = [...row[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(cell => plainText(cell[1]))
    const level = cells[0]
    if (!/^\d+$/.test(level ?? ''))
      continue
    for (const column of columns) {
      const id = tableIdByColumn[column.name]
      const raw = cells[column.index]
      if (!id || !raw || raw === '-' || raw === '~')
        continue
      const value = raw.replace(/к(?=\d)/gi, 'd')
      if (!values.has(id))
        values.set(id, {})
      values.get(id)![level] = value
    }
  }
  return columns
    .filter(column => tableIdByColumn[column.name] && values.has(tableIdByColumn[column.name]))
    .map(column => ({
      id: tableIdByColumn[column.name],
      name: column.name,
      values: values.get(tableIdByColumn[column.name])!,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

function parseSubclasses(html: string, classId: string) {
  const rows: SubclassRow[] = []
  const skipped: string[] = []
  for (const chunk of html.split('<div class="class__subclass__holder"').slice(1)) {
    const attrs = attrsOf(chunk)
    const code = toLatin(/data-code="([^"]*)"/.exec(attrs)?.[1] ?? '').replace(/^subclass\./, '')
    const name = fixMixedWords(decodeEntities(/data-title="([^"]*)"/.exec(attrs)?.[1] ?? ''))
    const id = subclassIdByCode[code]
    if (!id) {
      skipped.push(`${name} [${code}]`)
      continue
    }
    const blocks = featureChunks(divContent(chunk), '<div class="class__subclass__feature"')
    const usedIds = new Set<string>()
    const features = blocks
      .filter(block => levelOf(block) > 0)
      .flatMap(block => readFeature(block, usedIds) ?? [])
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'))
    // Блок уровня 0 — это вводное описание подкласса, у него нет ни заголовка, ни кода.
    const intro = blocks.find(block => levelOf(block) === 0)
    rows.push({
      id,
      classId,
      name,
      text: intro ? featureText(divContent(intro)) : '',
      features,
    })
  }
  return { rows, skipped }
}

function subclassLevelOf(html: string) {
  const levels = [...html.matchAll(/<div class="class__feature class__feature_subclass_place"[^>]*data-level="(\d+)"/g)]
    .map(match => Number(match[1]))
  return levels.length > 0 ? Math.min(...levels) : 3
}

export async function importDndSuClasses() {
  const classesFile = path.join(outDir, 'srd-2024-classes.json')
  const subclassesFile = path.join(outDir, 'srd-2024-subclasses.json')
  const previousClasses = JSON.parse(await readFile(classesFile, 'utf8')) as ClassRow[]
  const previousById = new Map(previousClasses.map(row => [row.id, row]))

  const classes: ClassRow[] = []
  const subclasses: SubclassRow[] = []
  const skippedSubclasses: string[] = []
  const emptyFields: string[] = []

  for (const slug of classSlugs) {
    const html = classBody(await fetchPage(`${classUrl}/${slug}`))
    const previous = previousById.get(slug)
    const traits = parseTraits(html)
    const offer = skillOfferOf(traits)
    const features = parseClassFeatures(html.split('<div class="class__subclass__holder"')[0])
    const asiLevels = features
      .filter(feature => feature.id.startsWith('ability-score-improvement') || feature.id.startsWith('epic-boon'))
      .map(feature => feature.level)
    const name = plainText(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '').split('/')[0].trim() || previous?.name || slug
    const hitDie = hitDieOf(traits)
    const saves = savesOf(traits)
    if (!hitDie || saves.length !== 2 || offer.skillChoices < 1 || offer.skills.length < 1)
      emptyFields.push(`${slug}: hitDie=${hitDie} saves=${saves.join('/')} skills=${offer.skillChoices}x${offer.skills.length}`)
    classes.push({
      id: slug,
      name,
      hitDie: hitDie || previous?.hitDie || '',
      saves: saves.length === 2 ? saves : previous?.saves ?? [],
      // Характеристика заклинаний, защита без доспехов, мастерство оружия и список заклинаний на странице не размечены.
      casting: previous?.casting ?? null,
      unarmored: previous?.unarmored ?? null,
      weaponMastery: previous?.weaponMastery ?? false,
      skillChoices: offer.skillChoices,
      skills: offer.skills,
      spellIds: previous?.spellIds ?? [],
      subclassLevel: subclassLevelOf(html),
      asiLevels: [...new Set(asiLevels)].sort((a, b) => a - b),
      traits,
      features,
      tables: parseTables(html),
    })
    const parsed = parseSubclasses(html, slug)
    subclasses.push(...parsed.rows)
    skippedSubclasses.push(...parsed.skipped.map(item => `${slug}: ${item}`))
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  classes.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  subclasses.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  await writeFile(classesFile, `${JSON.stringify(classes, null, 2)}\n`)
  await writeFile(subclassesFile, `${JSON.stringify(subclasses, null, 2)}\n`)

  return {
    classes: classes.length,
    subclasses: subclasses.length,
    features: classes.reduce((sum, row) => sum + row.features.length, 0),
    subclassFeatures: subclasses.reduce((sum, row) => sum + row.features.length, 0),
    emptyFields,
    skippedSubclasses,
  }
}

if (import.meta.main)
  console.log(JSON.stringify(await importDndSuClasses(), null, 2))
