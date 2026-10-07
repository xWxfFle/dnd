/* eslint-disable style/quote-props */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { skills } from '../packages/shared/src/types'
import { divContent, featureText, fetchCardPage, fetchPage, inlineText, mapLimit, plainText, slugOfLink, tidyText } from './dndsu-html'

const siteUrl = 'https://next.dnd.su'
const outDir = path.resolve('packages/shared/src')
const phbSource = '301'
const phbTitle = 'Player\'s Handbook 2024'

const abilityByRu = {
  'сила': 'str',
  'ловкость': 'dex',
  'телосложение': 'con',
  'интеллект': 'int',
  'мудрость': 'wis',
  'харизма': 'cha',
} as const satisfies Record<string, string>

const fieldByLabel = {
  'Характеристики': 'abilities',
  'Черта': 'feat',
  'Навыки': 'skills',
  'Инструменты': 'tools',
  'Снаряжение': 'equipment',
} as const satisfies Record<string, 'abilities' | 'feat' | 'skills' | 'tools' | 'equipment'>

interface BackgroundRow {
  id: string
  name: string
  originFeatId: string
  originFeatName: string
  abilities: string[]
  skills: string[]
  tools: string
  equipment: string
  text: string
}

function paramLis(body: string) {
  return [...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(match => match[1])
}

function labelOf(html: string) {
  return plainText(/<strong>([\s\S]*?)<\/strong>/.exec(html)?.[1] ?? '').replace(/:$/, '')
}

function restOf(html: string) {
  return html.replace(/<strong>[\s\S]*?<\/strong>/, '')
}

function abilitiesOf(html: string) {
  return inlineText(restOf(html))
    .split(/[,;]/)
    .map(part => abilityByRu[part.trim().toLowerCase() as keyof typeof abilityByRu])
    .filter((item): item is string => Boolean(item))
}

function kebabOf(value: string) {
  return value.replaceAll('_', '-').replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)
}

function skillsOf(html: string) {
  const ids = [...html.matchAll(/glossary\/skill\.([\w-]+)/g)].map(match => kebabOf(match[1]))
  return ids.filter((id): id is typeof skills[number] => (skills as readonly string[]).includes(id))
}

function featIdOf(html: string) {
  const href = /href="(\/feats\/[^"]+)"/.exec(html)?.[1] ?? /href='(\/feats\/[^']+)'/.exec(html)?.[1] ?? ''
  const slug = href ? slugOfLink(href) : ''
  return slug ? `feat-${slug}` : ''
}

function featNameOf(html: string) {
  return inlineText(restOf(html)).replace(/\([^)]*\)/g, '').trim()
}

function readListLinks(html: string) {
  return [...html.matchAll(/<div class='col list-item__spell for_filter'[^>]*data-source="(\d+)"[^>]*>[\s\S]*?href='(\/backgrounds\/[^']+)'/g)]
    .filter(match => match[1] === phbSource)
    .map(match => match[2])
}

function readCard(html: string) {
  const start = html.indexOf('<h2 class="card-title"')
  const header = html.slice(start, html.indexOf('</h2>', start))
  const name = plainText(/<span data-copy="[^"]*">([^<[]*)/.exec(header)?.[1] ?? '')
  const source = /class='source-plaque[^']*' title="([^"]*)"/.exec(header)?.[1] ?? ''
  const bodyStart = html.indexOf('<div class="card__body', start)
  const body = divContent(html.slice(bodyStart))
  const fields: Partial<Record<'abilities' | 'feat' | 'skills' | 'tools' | 'equipment', string>> = {}
  for (const li of paramLis(body)) {
    const field = fieldByLabel[labelOf(li) as keyof typeof fieldByLabel]
    if (field)
      fields[field] = li
  }
  const description = /<div itemprop="description">([\s\S]*?)<\/div>/.exec(body)?.[1] ?? ''
  return {
    name,
    source,
    originFeatId: featIdOf(fields.feat ?? ''),
    originFeatName: featNameOf(fields.feat ?? ''),
    abilities: abilitiesOf(fields.abilities ?? ''),
    skills: skillsOf(fields.skills ?? ''),
    tools: inlineText(restOf(fields.tools ?? '')),
    equipment: inlineText(restOf(fields.equipment ?? '')),
    text: tidyText(featureText(description)),
  }
}

export async function importDndSuBackgrounds() {
  const links = readListLinks(await fetchPage(`${siteUrl}/backgrounds/`))
  const skipped: string[] = []
  const rows = await mapLimit(links, async (link) => {
    const card = readCard(await fetchCardPage(`${siteUrl}${link}/`))
    if (card.source !== phbTitle) {
      skipped.push(`${card.name || link} [${card.source}]`)
      return null
    }
    const row: BackgroundRow = {
      id: slugOfLink(link),
      name: card.name,
      originFeatId: card.originFeatId,
      originFeatName: card.originFeatName,
      abilities: card.abilities,
      skills: card.skills,
      tools: card.tools,
      equipment: card.equipment,
      text: card.text,
    }
    return row
  })
  const backgrounds = rows.filter((row): row is BackgroundRow => row !== null)
  backgrounds.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  await writeFile(path.join(outDir, 'srd-2024-backgrounds.json'), `${JSON.stringify(backgrounds, null, 2)}\n`)
  return {
    backgrounds: backgrounds.length,
    emptyFeat: backgrounds.filter(row => !row.originFeatId).map(row => row.id),
    emptySkills: backgrounds.filter(row => row.skills.length !== 2).map(row => row.id),
    emptyAbilities: backgrounds.filter(row => row.abilities.length !== 3).map(row => row.id),
    emptyText: backgrounds.filter(row => !row.text).map(row => row.id),
    skipped,
  }
}

if (import.meta.main)
  console.log(JSON.stringify(await importDndSuBackgrounds(), null, 2))
