/* eslint-disable style/quote-props */

const cyrillicByLatin: Record<string, string> = {
  'a': 'а',
  'c': 'с',
  'e': 'е',
  'k': 'к',
  'm': 'м',
  'o': 'о',
  'p': 'р',
  'x': 'х',
  'y': 'у',
  'A': 'А',
  'B': 'В',
  'C': 'С',
  'E': 'Е',
  'H': 'Н',
  'K': 'К',
  'M': 'М',
  'O': 'О',
  'P': 'Р',
  'T': 'Т',
  'X': 'Х',
}

const entityByName: Record<string, string> = {
  'nbsp': ' ',
  'thinsp': ' ',
  'amp': '&',
  'lt': '<',
  'gt': '>',
  'quot': '"',
  'apos': '\'',
  'laquo': '«',
  'raquo': '»',
  'mdash': '—',
  'ndash': '–',
  'hellip': '…',
  'times': '×',
  'deg': '°',
  'shy': '',
  'ldquo': '«',
  'rdquo': '»',
  'rsquo': '\u2019',
  'lsquo': '\u2018',
}

// На сайте в русских словах попадаются латинские двойники («Воин cтихий»). Чиним только смешанные слова.
export function fixMixedWords(value: string) {
  return value.replace(/\S+/g, (word) => {
    if (!/\p{Script=Cyrillic}/u.test(word) || !/[a-z]/i.test(word))
      return word
    return word.replace(/[a-z]/gi, char => cyrillicByLatin[char] ?? char)
  })
}

export function slugOf(value: string) {
  return value
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entityByName[String(name).toLowerCase()] ?? match)
}

export function plainText(html: string) {
  return fixMixedWords(decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim())
}

// Таблицу внутри умения сохраняем строками «ячейка | ячейка», иначе её данные потерялись бы в плоском тексте.
export function tableToText(html: string) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((row) => {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(cell => plainText(cell[1]))
    return cells.join(' | ')
  })
  return rows.filter(Boolean).join('\n')
}

export function featureText(html: string) {
  const withTables = html.replace(/<table[\s\S]*?<\/table>/g, match => `\n${tableToText(match)}\n`)
  const withNames = withTables.replace(
    /<span class='article-body__feature-name'[^>]*>([\s\S]*?)<\/span>\s*\.?/g,
    (_, name) => `**${plainText(name)}.** `,
  )
  const broken = withNames
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h3|h4|li|tr)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '• ')
  const text = decodeEntities(broken.replace(/<[^>]+>/g, ''))
    .split('\n')
    .map(line => line.replace(/[^\S\n]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\*\*\n+/g, '** ')
    .trim()
  return fixMixedWords(text)
}

// Чанк после split тянется до конца страницы, поэтому режем его по закрытию собственного div.
export function divContent(chunk: string) {
  const start = chunk.indexOf('>') + 1
  const pattern = /<div\b|<\/div>/g
  pattern.lastIndex = start
  let depth = 1
  for (let match = pattern.exec(chunk); match; match = pattern.exec(chunk)) {
    depth += match[0] === '</div>' ? -1 : 1
    if (depth === 0)
      return chunk.slice(start, match.index)
  }
  return chunk.slice(start)
}

// Под нагрузкой сайт отвечает 503, поэтому повторяем с растущей паузой.
export async function fetchPage(url: string) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url)
    if (res.ok)
      return res.text()
    if (attempt === 5)
      throw new Error(`${res.status} ${url}`)
    await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
  }
  throw new Error(`unreachable ${url}`)
}

// Под нагрузкой сайт иногда отдаёт 200 без карточки; без повтора запись молча выпала бы как «не из нужной книги».
export async function fetchCardPage(url: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const html = await fetchPage(url)
    const start = html.indexOf('<h2 class="card-title"')
    if (start >= 0 && html.slice(start, html.indexOf('</h2>', start)).includes('source-plaque'))
      return html
    await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
  }
  throw new Error(`нет карточки: ${url}`)
}

// Пул из нескольких воркеров: сайт отвечает 503, если слать сотни запросов разом.
export async function mapLimit<T, R>(list: T[], run: (item: T) => Promise<R>, workers = 4) {
  const out: R[] = Array.from({ length: list.length })
  let next = 0
  await Promise.all(Array.from({ length: workers }, async () => {
    while (next < list.length) {
      const index = next++
      out[index] = await run(list[index])
    }
  }))
  return out
}

// Списки /items/, /spells/, /bestiary/ рисуются на клиенте из объекта window.LIST в HTML страницы.
export function readList<T>(html: string) {
  const marker = 'window.LIST = '
  const at = html.indexOf(marker)
  const end = html.indexOf('</script>', at)
  if (at < 0 || end < 0)
    throw new Error('на странице нет window.LIST')
  return JSON.parse(html.slice(at + marker.length, end).trim().replace(/;$/, '')) as { cards: T[] }
}

export function slugOfLink(link: string) {
  return link.replace(/^\/[a-z]+\/\d+-/, '').replace(/\/$/, '')
}

// Строчные теги внутри фразы снимаем без пробела, иначе выходит «Оружие ( Боевой топор )».
export function inlineText(html: string) {
  return plainText(html.replace(/<[^>]+>/g, ''))
}

// Ссылка в конце фразы оставляет пробел перед знаком: «Ифрит .», «(также Боевой посох )».
export function tidyText(text: string) {
  return text.replace(/[^\S\n]+([.,:;)])/g, '$1').replace(/\([^\S\n]+/g, '(')
}
