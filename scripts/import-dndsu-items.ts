import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { divContent, featureText, fetchCardPage, fetchPage, inlineText, mapLimit, plainText, readList, slugOfLink, tidyText } from './dndsu-html'

const siteUrl = 'https://next.dnd.su'
const outDir = path.resolve('packages/shared/src')
const phbSource = 'Player\'s Handbook 2024'
// Номера источников в фильтре списка магических предметов: 301 — PHB 2024, 302 — DMG 2024.
const magicSources = new Set([301, 302])

// Категории списка снаряжения, чьи предметы получают боевые статы.
const gearKindByLetter: Record<string, 'weapon' | 'armor' | 'shield'> = {
  melee_simple_weapon: 'weapon',
  ranged_simple_weapon: 'weapon',
  melee_martial_weapon: 'weapon',
  ranged_martial_weapon: 'weapon',
  light_armor: 'armor',
  medium_armor: 'armor',
  heavy_armor: 'armor',
  shield: 'shield',
}

const rarityByFilter: Record<number, string> = {
  1: 'uncommon',
  2: 'rare',
  3: 'very-rare',
  4: 'legendary',
  5: 'varies',
  6: 'common',
  7: 'artifact',
}

type Gear
  = | { kind: 'weapon', dice: string, damageType: string, ability: 'str' | 'dex' | 'finesse' }
    | { kind: 'armor', base: number, dexCap: number | null }
    | { kind: 'shield' }

interface ItemRow {
  id: string
  name: string
  category: string
  cost: string
  weight: string
  text: string
  gear?: Gear
}

interface MagicItemRow {
  id: string
  name: string
  type: string
  rarity: string
  attunement: boolean
  category: string
  cost: string
  text: string
}

interface ListCard {
  title: string
  link: string
  type_order: string
  item_tags: { attunement?: unknown }
  filter_source: number[]
  filter_rarity: number[]
}

interface ItemCard {
  name: string
  source: string
  category: string
  cost: string
  weight: string
  damage: string
  armorClass: string
  text: string
}

function paramOf(body: string, className: string) {
  const html = new RegExp(`<li class='${className}'>([\\s\\S]*?)</li>`).exec(body)?.[1] ?? ''
  return inlineText(html.replace(/<strong>[\s\S]*?<\/strong>/, ''))
}

function readCard(html: string): ItemCard {
  const start = html.indexOf('<h2 class="card-title"')
  const header = html.slice(start, html.indexOf('</h2>', start))
  const name = plainText(/<span data-copy="[^"]*">([^<[]*)/.exec(header)?.[1] ?? '')
  const source = /class='source-plaque[^']*' title="([^"]*)"/.exec(header)?.[1] ?? ''
  const bodyStart = html.indexOf('<div class="card__body', start)
  const body = divContent(html.slice(bodyStart))
  // Название, цена, вес, урон и КД уходят в отдельные поля, остальные пункты списка — это текст предмета.
  // Пункты верхнего уровня — это абзацы карточки, маркер «•» оставляем только вложенным спискам (состав набора).
  const rest = body
    .replace(/<li class='(size-type-alignment|price|weight|weapons|armors)'>[\s\S]*?<\/li>/g, '')
    .replace(/<li class=["'][^"']*["']>/g, '')
    .replace(/<li>(?=<span class='article-body__feature-name')/g, '')
    .replace(/<span tooltip-for='[^']*'>([^<]*)<\/span>/g, '$1')
    .replace(/<(b|strong)>([\s\S]*?)<\/\1>([.:]?)/g, (_, _tag, inner, mark) => `**${inlineText(inner)}${mark}** `)
  return {
    name,
    source,
    category: paramOf(body, 'size-type-alignment'),
    cost: paramOf(body, 'price'),
    weight: paramOf(body, 'weight'),
    damage: paramOf(body, 'weapons'),
    armorClass: paramOf(body, 'armors'),
    text: tidyText(featureText(rest)),
  }
}

async function fetchCard(link: string) {
  return readCard(await fetchCardPage(`${siteUrl}${link}/`))
}

function weaponGear(card: ItemCard): Gear | undefined {
  const [dice, damageType] = card.damage.split(',').map(part => part.trim())
  if (!dice || !damageType)
    return undefined
  const ability = /\*\*Фехтовальное\.\*\*/.test(card.text)
    ? 'finesse'
    : /дальнобойное/i.test(card.category) ? 'dex' : 'str'
  return { kind: 'weapon', dice: dice.replace(/к(?=\d)/gi, 'd'), damageType: damageType.toLowerCase(), ability }
}

function armorGear(card: ItemCard): Gear | undefined {
  const base = Number(/^\d+/.exec(card.armorClass)?.[0] ?? Number.NaN)
  if (!Number.isFinite(base))
    return undefined
  if (!/Ловкости/.test(card.armorClass))
    return { kind: 'armor', base, dexCap: 0 }
  const cap = /не более (\d+)/.exec(card.armorClass)?.[1]
  return { kind: 'armor', base, dexCap: cap ? Number(cap) : null }
}

const gearByKind = {
  weapon: weaponGear,
  armor: armorGear,
  shield: (): Gear => ({ kind: 'shield' }),
} as const

function idOf(link: string, letter: string) {
  const slug = slugOfLink(link)
  // У доспехов в каталоге id без суффикса -armor (leather, plate): на них уже ссылаются инвентари.
  return letter.endsWith('_armor') ? slug.replace(/-armor$/, '') : slug
}

async function importEquipment() {
  const list = await fetchPage(`${siteUrl}/equipment/`)
  const links = [...list.matchAll(/data-letter='([^']*)'>\s*<a href='([^']+)'/g)].map(match => ({ letter: match[1], link: match[2] }))
  const skipped: string[] = []
  const emptyGear: string[] = []
  const rows = await mapLimit(links, async ({ letter, link }) => {
    const card = await fetchCard(link)
    if (card.source !== phbSource) {
      skipped.push(`${card.name} [${card.source}]`)
      return null
    }
    const kind = gearKindByLetter[letter]
    const gear = kind ? gearByKind[kind](card) : undefined
    if (kind && !gear)
      emptyGear.push(card.name)
    const row: ItemRow = {
      id: idOf(link, letter),
      name: card.name,
      category: card.category,
      cost: card.cost,
      weight: card.weight,
      text: card.text,
    }
    return gear ? { ...row, gear } : row
  })
  const items = rows.filter((row): row is ItemRow => row !== null)
  return { items, skipped, emptyGear }
}

async function importMagicItems() {
  const { cards } = readList<ListCard>(await fetchPage(`${siteUrl}/items/`))
  const picked = new Map<string, ListCard>()
  for (const card of cards) {
    const id = idOf(card.link, '')
    if (card.filter_source.some(source => magicSources.has(source)) && !picked.has(id))
      picked.set(id, card)
  }
  const rows = await mapLimit([...picked], async ([id, listCard]): Promise<MagicItemRow> => {
    const card = await fetchCard(listCard.link)
    return {
      id,
      name: card.name || listCard.title,
      type: listCard.type_order,
      rarity: rarityByFilter[listCard.filter_rarity[0]] ?? 'varies',
      attunement: Boolean(listCard.item_tags.attunement),
      category: card.category,
      cost: card.cost,
      text: card.text,
    }
  })
  return rows
}

export async function importDndSuItems() {
  const equipment = await importEquipment()
  const magic = await importMagicItems()
  const equipmentIds = new Set(equipment.items.map(row => row.id))
  const clashes = magic.filter(row => equipmentIds.has(row.id)).map(row => row.id)
  if (clashes.length > 0)
    throw new Error(`id магических предметов совпадают со снаряжением: ${clashes.join(', ')}`)

  equipment.items.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  magic.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  await writeFile(path.join(outDir, 'srd-2024-items.json'), `${JSON.stringify(equipment.items, null, 2)}\n`)
  await writeFile(path.join(outDir, 'srd-2024-magic-items.json'), `${JSON.stringify(magic, null, 2)}\n`)

  return {
    equipment: equipment.items.length,
    gear: equipment.items.filter(row => row.gear).length,
    magicItems: magic.length,
    emptyGear: equipment.emptyGear,
    emptyText: [...equipment.items, ...magic].filter(row => !row.text).map(row => row.id),
    skippedEquipment: equipment.skipped,
  }
}

if (import.meta.main)
  console.log(JSON.stringify(await importDndSuItems(), null, 2))
