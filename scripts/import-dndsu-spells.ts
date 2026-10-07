import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { divContent, featureText, fetchCardPage, fetchPage, inlineText, mapLimit, plainText, readList, slugOfLink, tidyText } from './dndsu-html'

const siteUrl = 'https://next.dnd.su'
const outDir = path.resolve('packages/shared/src')
// Номер источника в фильтре списка заклинаний: 301 — PHB 2024.
const phbSource = 301

interface ListCard {
  title: string
  link: string
  level: number
  school: string
  item_tags: { concentration?: unknown, ritual?: unknown }
  filter_source: number[]
  filter_ritual: string[]
}

interface SpellRow {
  id: string
  name: string
  level: number
  school: string
  castTime: string
  range: string
  components: string
  duration: string
  ritual: boolean
  concentration: boolean
  classes: string[]
  dice: string
  text: string
}

function paramOf(body: string, className: string) {
  const html = new RegExp(`<li class='${className}'>([\\s\\S]*?)</li>`).exec(body)?.[1] ?? ''
  return inlineText(html.replace(/<strong>[\s\S]*?<\/strong>/, ''))
}

function blockOf(body: string, opening: string) {
  const at = body.indexOf(opening)
  return at < 0 ? '' : divContent(body.slice(at))
}

// Первые кости в описании — то, что бросают при сотворении: «8к6» у Огненного шара, «2к8» у Лечения ран.
function diceOf(description: string) {
  const match = /(\d+)к(\d+)(?:\s*\+\s*(\d+))?/.exec(description)
  if (!match)
    return ''
  return match[3] ? `${match[1]}d${match[2]} + ${match[3]}` : `${match[1]}d${match[2]}`
}

function readSpell(html: string, classIds: Set<string>) {
  const start = html.indexOf('<h2 class="card-title"')
  const header = html.slice(start, html.indexOf('</h2>', start))
  const name = plainText(/<span data-copy="[^"]*">([^<[]*)/.exec(header)?.[1] ?? '')
  const body = divContent(html.slice(html.indexOf('<div class="card__body', start)))
  const classLine = /<li class='class'>([\s\S]*?)<\/li>/.exec(body)?.[1] ?? ''
  // На сайте есть Артефактор, которого нет в каталоге: берём только известные классы.
  const classes = [...classLine.matchAll(/href='\/class\/([a-z-]+)'/g)]
    .map(match => match[1])
    .filter(id => classIds.has(id))
  const description = blockOf(body, '<div itemprop="description">')
  const higher = blockOf(body, '<div itemprop=\'spell__higher-levels\'>')
  const higherText = higher.replace(
    /<span class='spell__higher-levels__head'>([\s\S]*?)<\/span>/,
    (_, head) => `<span class='article-body__feature-name'>${inlineText(head).replace(/\.$/, '')}</span>.`,
  )
  return {
    name,
    castTime: paramOf(body, 'cast_time'),
    range: paramOf(body, 'range'),
    components: paramOf(body, 'components'),
    duration: paramOf(body, 'duration'),
    classes: [...new Set(classes)].sort(),
    dice: diceOf(plainText(description)),
    text: tidyText(featureText(`${description}${higherText ? `<p>${higherText}</p>` : ''}`)),
  }
}

export async function importDndSuSpells() {
  const classesFile = path.join(outDir, 'srd-2024-classes.json')
  const classRows = JSON.parse(await readFile(classesFile, 'utf8')) as Array<{ id: string, spellIds: string[] }>
  const classIds = new Set(classRows.map(row => row.id))

  const { cards } = readList<ListCard>(await fetchPage(`${siteUrl}/spells/`))
  const picked = cards.filter(card => card.filter_source.includes(phbSource))
  const spells = await mapLimit(picked, async (card): Promise<SpellRow> => {
    const spell = readSpell(await fetchCardPage(`${siteUrl}${card.link}/`), classIds)
    return {
      id: slugOfLink(card.link),
      name: spell.name || card.title,
      level: card.level,
      school: card.school.toLowerCase(),
      castTime: spell.castTime,
      range: spell.range,
      components: spell.components,
      duration: spell.duration,
      ritual: card.filter_ritual.includes('2'),
      concentration: Boolean(card.item_tags.concentration),
      classes: spell.classes,
      dice: spell.dice,
      text: spell.text,
    }
  })

  spells.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  await writeFile(path.join(outDir, 'srd-2024-spells.json'), `${JSON.stringify(spells, null, 2)}\n`)

  // Стартовые заклинания классов ссылаются на id каталога; после смены источника проверяем, что все они есть.
  const spellIds = new Set(spells.map(spell => `spell-${spell.id}`))
  const missingStarterSpells = classRows.flatMap(row => row.spellIds.filter(id => !spellIds.has(id)).map(id => `${row.id}: ${id}`))

  return {
    spells: spells.length,
    withoutClasses: spells.filter(spell => spell.classes.length === 0).map(spell => spell.id),
    emptyText: spells.filter(spell => !spell.text).map(spell => spell.id),
    missingStarterSpells,
  }
}

if (import.meta.main)
  console.log(JSON.stringify(await importDndSuSpells(), null, 2))
