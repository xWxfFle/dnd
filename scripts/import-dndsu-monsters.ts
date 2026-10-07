/* eslint-disable style/quote-props */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { divContent, featureText, fetchCardPage, fetchPage, inlineText, mapLimit, plainText, readList, slugOfLink, tidyText } from './dndsu-html'

const siteUrl = 'https://next.dnd.su'
const outDir = path.resolve('packages/shared/src')
// Номер источника в фильтре бестиария: 303 — Monster Manual 2024. Существа из PHB 2024 все есть и там.
const monsterSource = '303'

const abilityByTitle: Record<string, string> = {
  'СИЛ': 'str',
  'ЛОВ': 'dex',
  'ТЕЛ': 'con',
  'ИНТ': 'int',
  'МДР': 'wis',
  'ХАР': 'cha',
}

// Тип урона стоит рядом со словом «урона» в разных падежах: «Дробящего урона», «урона Огнём».
const damageTypeByStem: Record<string, string> = {
  'дробящ': 'дробящий',
  'колющ': 'колющий',
  'рубящ': 'рубящий',
  'огн': 'огонь',
  'холод': 'холод',
  'электричеств': 'молния',
  'звук': 'звук',
  'кислот': 'кислота',
  'яд': 'яд',
  'некротическ': 'некротический',
  'излучени': 'излучение',
  'силов': 'силовой',
  'психическ': 'психический',
}

// Атаки токена берём из действий и бонусных действий; реакции и легендарные действия остаются в тексте.
const attackSections = new Set(['Действия', 'Бонусные действия'])

// Параметры, которые уже лежат в отдельных полях или не нужны за столом.
const skippedParams = new Set(['Хиты', 'Скорость', 'Сокровища'])

interface ListCard {
  title: string
  link: string
  filter_source: string[]
}

interface AttackRow {
  id: string
  name: string
  attackBonus: number
  damageDice: string
  damageBonus: number
  damageType: string
  extraDice?: string
  range?: string
}

interface MonsterRow {
  id: string
  name: string
  type: string
  ac: number
  hp: number
  speed: number
  cr: number | null
  attacks: AttackRow[]
  abilities: Record<string, number>
  saves: Record<string, number>
  text: string
}

function damageTypeOf(words: string[]) {
  for (const word of words) {
    const lower = word.toLowerCase()
    const stem = Object.keys(damageTypeByStem).find(key => lower.startsWith(key))
    if (stem)
      return damageTypeByStem[stem]
  }
  return ''
}

// Тип не назван, а выбирается существом: «урона выбранного кобольдом типа: Кислотой, Огнём…».
function typeOf(words: string[], rest: string) {
  return damageTypeOf(words) || (/^[^.]*выбран/.test(`${words.join(' ')} ${rest}`) ? 'на выбор' : '')
}

// «12 (2к6 + 5) Дробящего урона», «8 (1к10 + 3) Колющий урон» или «1 урона Огнём» без костей.
function readDamage(text: string) {
  const rolled = /\d+\s*\((\d+)к(\d+)(?:\s*([+\-−])\s*(\d+))?\)(?:\s+(\S+))?\s+урона?\s*(?!плюс)(\S+)?/.exec(text)
  if (rolled) {
    const bonus = rolled[4] ? Number(rolled[4]) * (rolled[3] === '+' ? 1 : -1) : 0
    const rest = text.slice(rolled.index + rolled[0].length)
    return {
      dice: `${rolled[1]}d${rolled[2]}`,
      bonus,
      type: typeOf([rolled[5] ?? '', rolled[6] ?? ''], rest),
      rest,
    }
  }
  const flat = /(\d+)\s+(?:(\S+)\s+)?урона?\s*(?!плюс)(\S+)?/.exec(text)
  if (flat) {
    const rest = text.slice(flat.index + flat[0].length)
    return { dice: '0', bonus: Number(flat[1]), type: typeOf([flat[2] ?? '', flat[3] ?? ''], rest), rest }
  }
  return null
}

// Дополнительный урон без условия («плюс 5 (2к4) урона Огнём») бросается вместе с атакой; условный остаётся в тексте.
function extraDiceOf(rest: string) {
  const sentence = rest.split('.')[0]
  const extra = /^[\s,]*плюс\s+\d+\s*\((\d+)к(\d+)\)/.exec(sentence)
  if (!extra || /если|когда|пока/.test(sentence))
    return undefined
  return `${extra[1]}d${extra[2]}`
}

function readAttack(block: string, id: string, name: string): AttackRow | null {
  const hit = /__hitBonus">([+\-−]?\d+)/.exec(block)
  const plain = plainText(block)
  if (hit) {
    const after = plainText(block.slice(block.indexOf(hit[0])))
    const range = /,\s*((?:досягаемость|дистанция)[^.]*?фт\.(?:\s*или\s*(?:досягаемость|дистанция)[^.]*?фт\.)?)/.exec(after)?.[1]
    const damage = readDamage(plain.slice(plain.indexOf('Попадание')))
    const extraDice = damage ? extraDiceOf(damage.rest) : undefined
    return {
      id,
      name,
      attackBonus: Number(hit[1].replace('−', '-')),
      damageDice: damage?.dice ?? '0',
      damageBonus: damage?.bonus ?? 0,
      damageType: damage?.type ?? '',
      ...(extraDice ? { extraDice } : {}),
      ...(range ? { range } : {}),
    }
  }
  const save = /__save">([^<]*)<\/span>:\s*Сл\s*(\d+)/.exec(block)
  if (!save)
    return null
  const failure = plain.indexOf('Провал')
  const damage = failure >= 0 ? readDamage(plain.slice(failure)) : null
  return {
    id,
    name,
    attackBonus: 0,
    damageDice: damage?.dice ?? '0',
    damageBonus: damage?.bonus ?? 0,
    damageType: `${inlineText(save[1]).toLowerCase()} Сл ${save[2]}`,
  }
}

function sectionsOf(statBlock: string) {
  return [...statBlock.matchAll(/<li class="article-body__monster__section[^"]*">\s*<h3 class='article-body__monster__section-title'>([^<]*)<\/h3>/g)]
    .map(match => ({
      title: plainText(match[1]),
      body: divContent(statBlock.slice(statBlock.indexOf('<div class="article-body__monster__section-body"', match.index))),
    }))
}

function attacksOf(sections: Array<{ title: string, body: string }>) {
  const usedIds = new Set<string>()
  return sections
    .filter(section => attackSections.has(section.title))
    .flatMap(section => [...section.body.matchAll(/<p class="article-body__monster-(?:attack|attack-with-save|save-effect)[^"]*">([\s\S]*?)<\/p>/g)])
    .flatMap((match) => {
      const nameSpan = /<span class='article-body__monster-[a-z-]+__name'[^>]*data-monster-block="([^"]*)"[^>]*>([\s\S]*?)<\/span>/.exec(match[1])
      if (!nameSpan)
        return []
      const base = nameSpan[1] || 'attack'
      const id = usedIds.has(base) ? `${base}-${usedIds.size}` : base
      usedIds.add(id)
      return readAttack(match[1], id, plainText(nameSpan[2])) ?? []
    })
}

// Разметку атак и эффектов приводим к виду умений: «**Имя.** Бросок рукопашной атаки: +9 … **Попадание:** …».
function sectionText(body: string) {
  return featureText(body
    .replace(/\s+/g, ' ')
    .replace(/<span class='article-body__monster-[a-z-]+__name'[^>]*>/g, '<span class=\'article-body__feature-name\'>')
    .replace(/<span class=["']article-body__monster-[a-z-]+__piece[^"']*["']>([^<]*)<\/span>:?/g, (_, piece) => `<b>${piece}:</b>`)
    .replace(/<(b|strong)>([\s\S]*?)<\/\1>/g, (_, _tag, inner) => `**${inlineText(inner)}** `))
}

function paramsText(statBlock: string) {
  const lines: string[] = []
  const initiative = /<span class="subsection-initiative">([\s\S]*?)<\/span>\s*<\/li>/.exec(statBlock)?.[1]
  if (initiative)
    lines.push(`**Инициатива** ${inlineText(initiative.replace(/<strong>[\s\S]*?<\/strong>/, ''))}`)
  for (const match of statBlock.matchAll(/<li class='(?:skills)?'><strong>([^<]*)<\/strong>([\s\S]*?)<\/li>/g)) {
    const label = plainText(match[1])
    if (skippedParams.has(label))
      continue
    lines.push(`**${label}** ${inlineText(match[2].replace(/<sup>[\s\S]*?<\/sup>/g, ''))}`)
  }
  return lines.join('\n')
}

function crOf(statBlock: string) {
  const raw = /<strong>Опасность<\/strong>\s*([\d/]+)/.exec(statBlock)?.[1]
  if (!raw)
    return null
  const [top, bottom] = raw.split('/').map(Number)
  return bottom ? top / bottom : top
}

function readMonster(html: string) {
  const start = html.indexOf('<h2 class="card-title"')
  const header = html.slice(start, html.indexOf('</h2>', start))
  const body = divContent(html.slice(html.indexOf('<div class="card__body', start)))
  // После статблока идёт описание монстра из книги — его не берём.
  const lore = body.indexOf('<h3 class="article-body__header_small_underlined">')
  const statBlock = lore >= 0 ? body.slice(0, lore) : body
  const abilities: Record<string, number> = {}
  const saves: Record<string, number> = {}
  for (const row of statBlock.matchAll(/<div class='title'>([^<]*)<\/div><div class='value'>(\d+)<\/div>\s*<div class='mod'>([^<]*)<\/div><div class='save'>([^<]*)<\/div>/g)) {
    const ability = abilityByTitle[row[1]]
    if (!ability)
      continue
    abilities[ability] = Number(row[2])
    if (row[4] !== row[3])
      saves[ability] = Number(row[4].replace('−', '-'))
  }
  const sections = sectionsOf(statBlock)
  const text = [
    paramsText(statBlock),
    ...sections.map(section => `**${section.title}**\n\n${sectionText(section.body)}`),
  ].filter(Boolean).join('\n\n')
  return {
    name: plainText(/<span data-copy="[^"]*">([^<[]*)/.exec(header)?.[1] ?? ''),
    type: inlineText((/<li class='size-type-alignment'>([\s\S]*?)<\/li>/.exec(statBlock)?.[1] ?? '').replace(/<sup>[\s\S]*?<\/sup>/g, '')),
    ac: Number(/<strong>Класс Защиты<\/strong>\s*(\d+)/.exec(statBlock)?.[1] ?? 10),
    hp: Number(/<span data-type='middle'>(\d+)</.exec(statBlock)?.[1] ?? 1),
    speed: Number(/<strong>Скорость<\/strong>\s*<strong>(\d+)/.exec(statBlock)?.[1] ?? 0),
    cr: crOf(statBlock),
    attacks: attacksOf(sections),
    abilities,
    saves,
    text: tidyText(text),
  }
}

export async function importDndSuMonsters() {
  const { cards } = readList<ListCard>(await fetchPage(`${siteUrl}/bestiary/`))
  const picked = cards.filter(card => card.filter_source.includes(monsterSource))
  const monsters = await mapLimit(picked, async (card): Promise<MonsterRow> => {
    const monster = readMonster(await fetchCardPage(`${siteUrl}${card.link}/`))
    return { id: slugOfLink(card.link), ...monster, name: monster.name || card.title }
  })

  monsters.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  await writeFile(path.join(outDir, 'srd-2024-monsters.json'), `${JSON.stringify(monsters, null, 2)}\n`)

  return {
    monsters: monsters.length,
    withoutAttacks: monsters.filter(row => row.attacks.length === 0).map(row => row.id),
    incompleteAbilities: monsters.filter(row => Object.keys(row.abilities).length !== 6).map(row => row.id),
    untypedDamage: monsters.flatMap(row => row.attacks.filter(attack => !attack.damageType && (attack.damageDice !== '0' || attack.damageBonus)).map(attack => `${row.id}: ${attack.name}`)),
  }
}

if (import.meta.main)
  console.log(JSON.stringify(await importDndSuMonsters(), null, 2))
