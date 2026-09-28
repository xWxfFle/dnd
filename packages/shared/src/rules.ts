import type { Abilities, Ability, AttackDef } from './types'

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

export function attackBonus(abilities: Abilities, ability: Ability, level: number, proficient: boolean) {
  return abilityModifier(abilities[ability]) + (proficient ? proficiencyBonus(level) : 0)
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
