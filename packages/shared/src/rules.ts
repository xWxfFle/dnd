import type { Abilities, Ability, AttackDef, GearAbility, GearStats, InventoryItem, ItemKind, SaveOverrides } from './types'
import { abilities as abilityKeys } from './types'

export function abilityModifier(score: number) {
  return Math.floor((score - 10) / 2)
}

export function proficiencyBonus(level: number) {
  return Math.ceil(Math.max(1, level) / 4) + 1
}

export function exhaustionD20Penalty(level: number) {
  return Math.max(0, level) * 2
}

export function exhaustionSpeedPenalty(level: number) {
  return Math.max(0, level) * 5
}

export function isDeadFromExhaustion(level: number) {
  return level >= 10
}

export function isBloodied(current: number, max: number) {
  return max > 0 && current > 0 && current <= max / 2
}

export const diceSides = [4, 6, 8, 10, 12, 20, 100] as const

export interface DieTerm {
  count: number
  sides: number
  sign: 1 | -1
}

const allowedSides = new Set<number>(diceSides)

export function formatDiceFormula(dice: DieTerm[], bonus: number) {
  const diceText = dice.map((term, index) => {
    const body = `${term.count}d${term.sides}`
    if (index === 0)
      return term.sign === -1 ? `-${body}` : body
    return `${term.sign === -1 ? '-' : '+'}${body}`
  }).join('')
  if (!diceText)
    return bonus === 0 ? '' : String(bonus)
  if (bonus === 0)
    return diceText
  return bonus > 0 ? `${diceText}+${bonus}` : `${diceText}${bonus}`
}

export function readDiceFormula(formula: string): { dice: DieTerm[], bonus: number, formula: string } | null {
  const cleaned = formula.replace(/\s+/g, '').toLowerCase().replace(/(^|[+-])d(\d+)/g, (_, sign: string, sides: string) => `${sign}1d${sides}`)
  if (!cleaned)
    return null
  const parts = cleaned.match(/[+-]?[^+-]+/g) ?? []
  if (parts.length === 0)
    return null
  for (const part of parts) {
    const body = part.replace(/^[+-]/, '')
    if (!/^\d*d\d+$/.test(body) && !/^\d+$/.test(body))
      return null
  }
  const parsed = parseDice(cleaned)
  if (parsed.dice.length === 0)
    return null
  let count = 0
  for (const term of parsed.dice) {
    if (!Number.isInteger(term.count) || term.count < 1 || term.count > 40)
      return null
    if (!allowedSides.has(term.sides))
      return null
    count += term.count
  }
  if (count > 40 || !Number.isInteger(parsed.bonus) || Math.abs(parsed.bonus) > 100)
    return null
  return { ...parsed, formula: formatDiceFormula(parsed.dice, parsed.bonus) }
}

export function parseDice(formula: string): { dice: DieTerm[], bonus: number } {
  const cleaned = formula.replace(/\s+/g, '').toLowerCase()
  if (!cleaned)
    return { dice: [], bonus: 0 }
  const parts = cleaned.match(/[+-]?[^+-]+/g) ?? []
  const dice: DieTerm[] = []
  let bonus = 0
  for (const part of parts) {
    const sign: 1 | -1 = part.startsWith('-') ? -1 : 1
    const body = part.replace(/^[+-]/, '')
    const die = body.match(/^(\d*)d(\d+)$/)
    if (die) {
      dice.push({
        count: die[1] ? Number(die[1]) : 1,
        sides: Number(die[2]),
        sign,
      })
    }
    else if (/^\d+$/.test(body)) {
      bonus += sign * Number(body)
    }
  }
  return { dice, bonus }
}

function rollDie(sides: number, random: () => number) {
  return 1 + Math.floor(random() * sides)
}

export interface DiceRollResult {
  formula: string
  rolls: number[]
  total: number
  kept: number[]
}

export function rollFormula(formula: string, random: () => number = Math.random): DiceRollResult {
  const parsed = parseDice(formula)
  const rolls: number[] = []
  let total = parsed.bonus
  for (const term of parsed.dice) {
    for (let i = 0; i < term.count; i++) {
      const value = rollDie(term.sides, random)
      rolls.push(value)
      total += term.sign * value
    }
  }
  return { formula, rolls, total, kept: rolls }
}

export function rollD20(options: {
  bonus: number
  mode: 'normal' | 'advantage' | 'disadvantage'
  exhaustion?: number
  random?: () => number
}) {
  const random = options.random ?? Math.random
  const first = rollDie(20, random)
  const second = options.mode === 'normal' ? null : rollDie(20, random)
  const pool = second == null ? [first] : [first, second]
  const natural = options.mode === 'advantage'
    ? Math.max(...pool)
    : options.mode === 'disadvantage'
      ? Math.min(...pool)
      : first
  const penalty = exhaustionD20Penalty(options.exhaustion ?? 0)
  return {
    rolls: pool,
    natural,
    total: natural + options.bonus - penalty,
    penalty,
  }
}

export function rollDamage(formula: string, critical: boolean, random: () => number = Math.random) {
  const parsed = parseDice(formula)
  const dicePart = parsed.dice
    .map(term => `${term.sign === -1 ? '-' : ''}${term.count}d${term.sides}`)
    .join('+') || '0'
  const first = rollFormula(dicePart, random)
  const second = critical ? rollFormula(dicePart, random) : { rolls: [] as number[], total: 0 }
  return {
    rolls: [...first.rolls, ...second.rolls],
    total: first.total + second.total + parsed.bonus,
  }
}

export function readArmorClass(body: Record<string, unknown> | null | undefined) {
  const ac = body?.ac
  return typeof ac === 'number' ? ac : null
}

export function resolveAttack(input: {
  attack: AttackDef
  armorClass: number
  exhaustion?: number
  random?: () => number
}) {
  const random = input.random ?? Math.random
  const attack = rollD20({
    bonus: input.attack.attackBonus,
    mode: 'normal',
    exhaustion: input.exhaustion,
    random,
  })
  const critical = attack.natural === 20
  const miss = attack.natural === 1 || (!critical && attack.total < input.armorClass)
  if (miss) {
    return { hit: false as const, critical: false, attack, damage: 0 }
  }
  const rolled = attackDamage(input.attack, critical, random)
  return {
    hit: true as const,
    critical,
    attack,
    damage: Math.max(0, rolled.total),
  }
}

export function attackDamage(attack: AttackDef, critical: boolean, random: () => number = Math.random) {
  const weapon = rollFormula(attack.damageDice || '0', random)
  const doubled = critical ? rollFormula(attack.damageDice || '0', random) : { total: 0, rolls: [] as number[] }
  const extra = attack.extraDice ? rollFormula(attack.extraDice, random) : { total: 0, rolls: [] as number[] }
  return {
    total: weapon.total + doubled.total + extra.total + attack.damageBonus,
    weaponRolls: weapon.rolls,
    critRolls: doubled.rolls,
    extraRolls: extra.rolls,
  }
}

export function spellSaveDc(abilities: Abilities, casting: Ability, level: number) {
  return 8 + proficiencyBonus(level) + abilityModifier(abilities[casting])
}

export function readAbilities(value: unknown): Abilities | null {
  if (!value || typeof value !== 'object')
    return null
  const row = value as Record<string, unknown>
  const scores = {} as Abilities
  for (const key of abilityKeys) {
    const score = row[key]
    if (typeof score !== 'number' || !Number.isInteger(score))
      return null
    scores[key] = score
  }
  return scores
}

export function readSaveOverrides(value: unknown): SaveOverrides {
  if (!value || typeof value !== 'object')
    return {}
  const row = value as Record<string, unknown>
  const saves: SaveOverrides = {}
  for (const key of abilityKeys) {
    const bonus = row[key]
    if (typeof bonus === 'number' && Number.isInteger(bonus))
      saves[key] = bonus
  }
  return saves
}

export function saveBonus(abilities: Abilities, saves: SaveOverrides, ability: Ability) {
  return saves[ability] ?? abilityModifier(abilities[ability])
}

export function attackBonus(abilities: Abilities, ability: Ability, level: number, proficient: boolean) {
  return abilityModifier(abilities[ability]) + (proficient ? proficiencyBonus(level) : 0)
}

export function d20Formula(bonus: number) {
  if (bonus === 0)
    return '1d20'
  if (bonus > 0)
    return `1d20+${bonus}`
  return `1d20${bonus}`
}

export function armorClass(options: {
  abilities: Abilities
  base?: number
  dexCap?: number | null
  shield?: number
}) {
  const dex = abilityModifier(options.abilities.dex)
  const capped = options.dexCap == null ? dex : Math.min(dex, options.dexCap)
  return (options.base ?? 10) + capped + (options.shield ?? 0)
}

const itemKindByKey = {
  weapon: 'weapon',
  armor: 'armor',
  shield: 'shield',
  gear: 'gear',
} as const satisfies Record<string, ItemKind>

export function readInventory(value: unknown): InventoryItem[] {
  if (!Array.isArray(value))
    return []
  return value.flatMap((entry) => {
    const item = readInventoryItem(entry)
    return item ? [item] : []
  })
}

export function weaponAbility(abilities: Abilities, ability: GearAbility): Ability {
  if (ability !== 'finesse')
    return ability
  return abilityModifier(abilities.dex) > abilityModifier(abilities.str) ? 'dex' : 'str'
}

export function equipmentSheet(input: {
  abilities: Abilities
  level: number
  inventory: InventoryItem[]
  attacks: AttackDef[]
  gearOf: (itemId: string) => { name: string, stats: GearStats } | null
}) {
  const inventory = settleEquipped(input.inventory.map(item => alignGear(item, input.gearOf(item.itemId))))
  const armor = inventory.find(item => item.kind === 'armor' && item.equipped)
  const armorStats = armor ? input.gearOf(armor.itemId)?.stats : null
  const shield = inventory.some(item => item.kind === 'shield' && item.equipped)
  const ac = armorClass({
    abilities: input.abilities,
    base: armorStats?.kind === 'armor' ? armorStats.base : 10,
    dexCap: armorStats?.kind === 'armor' ? armorStats.dexCap : null,
    shield: shield ? 2 : 0,
  })
  const weapons = inventory.flatMap((item) => {
    if (item.kind !== 'weapon' || !item.equipped)
      return []
    const stats = input.gearOf(item.itemId)?.stats
    if (stats?.kind !== 'weapon')
      return []
    const ability = weaponAbility(input.abilities, stats.ability)
    return [{
      id: `gear-${item.id}`,
      name: item.name,
      attackBonus: attackBonus(input.abilities, ability, input.level, true),
      damageDice: stats.dice,
      damageBonus: abilityModifier(input.abilities[ability]),
      damageType: stats.damageType,
    }]
  })
  const spells = input.attacks.filter(attack => attack.id === 'spell')
  return { inventory, ac, attacks: [...weapons, ...spells] }
}

export function monsterEquipment(input: {
  abilities: Abilities
  baseAc: number
  inventory: InventoryItem[]
  attacks: AttackDef[]
  gearOf: (itemId: string) => { name: string, stats: GearStats } | null
}) {
  const worn = equipmentSheet({
    abilities: input.abilities,
    level: 1,
    inventory: input.inventory,
    attacks: [],
    gearOf: input.gearOf,
  })
  const armor = worn.inventory.some(item => item.kind === 'armor' && item.equipped)
  const shield = worn.inventory.some(item => item.kind === 'shield' && item.equipped)
  const natural = input.attacks.filter(attack => !attack.id.startsWith('gear-'))
  const ac = armor ? worn.ac : input.baseAc + (shield ? 2 : 0)
  return {
    inventory: worn.inventory,
    ac,
    attacks: [...natural, ...worn.attacks].slice(0, 12),
  }
}

function readInventoryItem(value: unknown): InventoryItem | null {
  if (!value || typeof value !== 'object')
    return null
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || typeof item.name !== 'string')
    return null
  const kind = typeof item.kind === 'string' && Object.hasOwn(itemKindByKey, item.kind)
    ? itemKindByKey[item.kind as keyof typeof itemKindByKey]
    : 'gear'
  return {
    id: item.id,
    itemId: typeof item.itemId === 'string' ? item.itemId : item.id,
    name: item.name,
    quantity: typeof item.quantity === 'number' ? item.quantity : 1,
    kind,
    equipped: item.equipped === true,
  }
}

function alignGear(item: InventoryItem, gear: { name: string, stats: GearStats } | null): InventoryItem {
  if (!gear)
    return { ...item, kind: 'gear', equipped: false }
  return { ...item, name: gear.name, kind: gear.stats.kind }
}

function settleEquipped(items: InventoryItem[]) {
  const lastIndex = { armor: -1, shield: -1 }
  items.forEach((item, index) => {
    if ((item.kind === 'armor' || item.kind === 'shield') && item.equipped)
      lastIndex[item.kind] = index
  })
  return items.map((item, index) => {
    if (item.kind === 'gear')
      return { ...item, equipped: false }
    if (item.kind === 'armor' || item.kind === 'shield')
      return { ...item, equipped: index === lastIndex[item.kind] }
    return item
  })
}

export function longRestExhaustion(level: number) {
  return Math.max(0, level - 1)
}

export function hitDieHeal(sides: number, conScore: number, random: () => number = Math.random) {
  return Math.max(1, rollDie(sides, random) + abilityModifier(conScore))
}

export function hitDieSidesForClass(hitDie: string) {
  const match = hitDie.match(/d(\d+)/)
  return match ? Number(match[1]) : 8
}

export interface GridToken {
  id: string
  sceneId: string
  x: number
  y: number
  characterId: string | null
}

export function concealEnemies(input: {
  tokens: GridToken[]
  fogByScene: ReadonlyMap<string, { points: number[] }[]>
}) {
  const hidden = new Set<string>()
  const obscured = new Set<string>()
  const allies = input.tokens.filter(token => token.characterId != null)
  for (const token of input.tokens) {
    if (token.characterId != null)
      continue
    const fog = input.fogByScene.get(token.sceneId) ?? []
    if (!coversCell(fog, token.x, token.y))
      continue
    const seen = allies.some(ally => ally.sceneId === token.sceneId && beside(ally, token))
    if (seen)
      obscured.add(token.id)
    else
      hidden.add(token.id)
  }
  return { hidden, obscured }
}

function beside(left: { x: number, y: number }, right: { x: number, y: number }) {
  return Math.abs(left.x - right.x) <= 1 && Math.abs(left.y - right.y) <= 1
}

function coversCell(fog: { points: number[] }[], x: number, y: number) {
  return fog.some(polygon => cellInside(polygon.points, x, y))
}

function cellInside(points: number[], x: number, y: number) {
  const square = squareOf(points)
  if (square)
    return square.x === x && square.y === y
  return contains(points, x + 0.5, y + 0.5)
}

function squareOf(points: number[]) {
  const [x, y, x2, y2, x3, y3, x4, y4] = points
  if (points.length !== 8 || x == null || y == null)
    return null
  if (x2 !== x + 1 || y2 !== y || x3 !== x + 1 || y3 !== y + 1 || x4 !== x || y4 !== y + 1)
    return null
  return { x, y }
}

function contains(points: number[], x: number, y: number) {
  let inside = false
  for (let i = 0, j = points.length - 2; i < points.length; i += 2) {
    const xi = points[i] ?? 0
    const yi = points[i + 1] ?? 0
    const xj = points[j] ?? 0
    const yj = points[j + 1] ?? 0
    const cross = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (cross)
      inside = !inside
    j = i
  }
  return inside
}
