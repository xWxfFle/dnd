import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { divContent, featureText, fetchCardPage, fetchPage, mapLimit, plainText, readList, slugOfLink, tidyText } from './dndsu-html'

const siteUrl = 'https://next.dnd.su'
const outDir = path.resolve('packages/shared/src')
const phbSource = 301
const phbTitle = 'Player\'s Handbook 2024'

const categoryByFilter = {
  origin: 'origin',
  general: 'general',
  fighting_style: 'fighting-style',
  epic_boon: 'epic-boon',
} as const satisfies Record<string, 'origin' | 'general' | 'fighting-style' | 'epic-boon'>

interface ListCard {
  title: string
  link: string
  filter_source: number[]
  filter_category: string[]
}

interface FeatRow {
  id: string
  name: string
  category: 'origin' | 'fighting-style' | 'epic-boon' | 'general'
  text: string
}

function categoryOf(filters: string[]) {
  const key = filters[0] as keyof typeof categoryByFilter | undefined
  if (!key)
    return 'general'
  return categoryByFilter[key] ?? 'general'
}

function blockOf(body: string, marker: string) {
  const at = body.indexOf(marker)
  if (at < 0)
    return ''
  const open = body.lastIndexOf('<div', at)
  return open < 0 ? '' : divContent(body.slice(open))
}

function readCard(html: string) {
  const start = html.indexOf('<h2 class="card-title"')
  const header = html.slice(start, html.indexOf('</h2>', start))
  const name = plainText(/<span data-copy="[^"]*">([^<[]*)/.exec(header)?.[1] ?? '')
  const source = /class='source-plaque[^']*' title="([^"]*)"/.exec(header)?.[1] ?? ''
  const body = divContent(html.slice(html.indexOf('<div class="card__body', start)))
  return {
    name,
    source,
    text: tidyText(featureText(blockOf(body, 'itemprop="description"'))),
  }
}

export async function importDndSuFeats() {
  const cards = readList<ListCard>(await fetchPage(`${siteUrl}/feats/`)).cards.filter(card =>
    card.filter_source.some(value => Number(value) === phbSource),
  )
  const skipped: string[] = []
  const rows = await mapLimit(cards, async (card) => {
    const parsed = readCard(await fetchCardPage(`${siteUrl}${card.link}/`))
    if (parsed.source !== phbTitle) {
      skipped.push(`${parsed.name || card.link} [${parsed.source}]`)
      return null
    }
    const id = slugOfLink(card.link)
    if (id === 'ability-score-improvement')
      return null
    const row: FeatRow = {
      id,
      name: parsed.name || card.title,
      category: categoryOf(card.filter_category),
      text: parsed.text,
    }
    return row
  })
  const feats = rows.filter((row): row is FeatRow => row !== null)
  feats.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  await writeFile(path.join(outDir, 'srd-2024-feats.json'), `${JSON.stringify(feats, null, 2)}\n`)
  return {
    feats: feats.length,
    emptyText: feats.filter(row => !row.text).map(row => row.id),
    byCategory: {
      origin: feats.filter(row => row.category === 'origin').length,
      general: feats.filter(row => row.category === 'general').length,
      fightingStyle: feats.filter(row => row.category === 'fighting-style').length,
      epicBoon: feats.filter(row => row.category === 'epic-boon').length,
    },
    skipped,
  }
}

if (import.meta.main)
  console.log(JSON.stringify(await importDndSuFeats(), null, 2))
