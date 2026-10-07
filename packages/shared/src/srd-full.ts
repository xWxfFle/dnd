import type { SrdSeed } from './srd'
import { srdCatalog } from './srd'
import magicItemRows from './srd-2024-magic-items.json'
import monsterRows from './srd-2024-monsters.json'
import spellRows from './srd-2024-spells.json'

const spells: SrdSeed[] = spellRows.map(row => ({
  id: `spell-${row.id}`,
  kind: 'spell' as const,
  name: row.name,
  body: {
    level: row.level,
    dice: row.dice,
    text: row.text,
    school: row.school,
    classes: row.classes,
    castTime: row.castTime,
    range: row.range,
    components: row.components,
    duration: row.duration,
    ritual: row.ritual,
    concentration: row.concentration,
  },
}))

const monsters: SrdSeed[] = monsterRows.map(row => ({
  id: `monster-${row.id}`,
  kind: 'monster' as const,
  name: row.name,
  body: {
    type: row.type,
    ac: row.ac,
    hp: row.hp,
    speed: row.speed,
    cr: row.cr,
    attacks: row.attacks,
    abilities: row.abilities,
    saves: row.saves,
    text: row.text,
  },
}))

// Магические предметы — справочник: бонусы вроде +1 мастер учитывает вручную, поэтому статов у них нет.
const magicItems: SrdSeed[] = magicItemRows.map(row => ({
  id: `item-${row.id}`,
  kind: 'item' as const,
  name: row.name,
  body: {
    kind: 'gear',
    magic: true,
    type: row.type,
    rarity: row.rarity,
    attunement: row.attunement,
    category: row.category,
    cost: row.cost,
    text: row.text,
  },
}))

// Полный справочник для API и таблицы srd_entries. Интерфейс этот модуль не импортирует.
export const srdFullCatalog: SrdSeed[] = [...srdCatalog, ...spells, ...monsters, ...magicItems]

export function srdFullById(id: string) {
  return srdFullCatalog.find(entry => entry.id === id) ?? null
}
