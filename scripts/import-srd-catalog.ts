import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { importDndSuClasses } from './import-dndsu-classes'
import { importDndSuItems } from './import-dndsu-items'
import { importDndSuMonsters } from './import-dndsu-monsters'
import { importDndSuSpells } from './import-dndsu-spells'
import { importHeroes } from './import-srd-heroes'

const open5e = 'https://api.open5e.com/v2'
const outDir = path.resolve('packages/shared/src')

async function paginate<T>(url: string): Promise<T[]> {
  const rows: T[] = []
  let next: string | null = url
  while (next) {
    const res = await fetch(next)
    if (!res.ok)
      throw new Error(`${res.status} ${next}`)
    const body = await res.json() as { results?: T[], next?: string | null }
    rows.push(...(body.results ?? []))
    next = body.next ?? null
  }
  return rows
}

const heroes = await importHeroes(paginate, open5e)
await mkdir(outDir, { recursive: true })
await writeFile(path.join(outDir, 'srd-2024-classes.json'), `${JSON.stringify(heroes.classes, null, 2)}\n`)
await writeFile(path.join(outDir, 'srd-2024-subclasses.json'), `${JSON.stringify(heroes.subclasses, null, 2)}\n`)
await writeFile(path.join(outDir, 'srd-2024-feats.json'), `${JSON.stringify(heroes.feats, null, 2)}\n`)
await writeFile(path.join(outDir, 'srd-2024-backgrounds.json'), `${JSON.stringify(heroes.backgrounds, null, 2)}\n`)
// Черты и предыстории пока из Open5e; классы, подклассы, снаряжение, заклинания и монстры — с dnd.su поверх.
const dndsu = await importDndSuClasses()
const dndsuItems = await importDndSuItems()
// Заклинания читают srd-2024-classes.json, поэтому идут после классов.
const dndsuSpells = await importDndSuSpells()
const dndsuMonsters = await importDndSuMonsters()
console.log(JSON.stringify({
  spells: dndsuSpells.spells,
  spellsWithoutClasses: dndsuSpells.withoutClasses,
  missingStarterSpells: dndsuSpells.missingStarterSpells,
  items: dndsuItems.equipment,
  magicItems: dndsuItems.magicItems,
  dndsuEmptyGear: dndsuItems.emptyGear,
  monsters: dndsuMonsters.monsters,
  monstersWithoutAttacks: dndsuMonsters.withoutAttacks,
  untypedDamage: dndsuMonsters.untypedDamage,
  classes: dndsu.classes,
  subclasses: dndsu.subclasses,
  classFeatures: dndsu.features,
  subclassFeatures: dndsu.subclassFeatures,
  dndsuEmptyFields: dndsu.emptyFields,
  backgrounds: heroes.backgrounds.length,
  feats: heroes.feats.length,
  latinHeroes: heroes.latin.slice(0, 80),
  latinHeroCount: heroes.latin.length,
}, null, 2))
