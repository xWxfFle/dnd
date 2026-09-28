export const APP_NAME = 'Стол D&D' as const
export const API_VERSION = 'v1' as const

export const SRD_ATTRIBUTION
  = 'This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.'

export type CampaignRole = 'dm' | 'player'
export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type DiceMode = 'normal' | 'advantage' | 'disadvantage' | 'crit'
export type SrdKind = 'class' | 'species' | 'background' | 'feat' | 'spell' | 'monster' | 'item'
export type RestKind = 'short' | 'long'

export interface Abilities {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface AttackDef {
  id: string
  name: string
  attackBonus: number
  damageDice: string
  damageBonus: number
  damageType: string
  extraDice?: string
  range?: string
}

export interface SpellSlot {
  level: number
  max: number
  spent: number
}

export interface KnownSpell {
  id: string
  name: string
  level: number
}

export interface ClassFeature {
  id: string
  name: string
  text: string
  formula?: string
  subclass: boolean
}

export interface DeathSaves {
  successes: number
  failures: number
}

export interface InventoryItem {
  id: string
  name: string
  quantity: number
}

export const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

export const abilityLabel: Record<Ability, string> = {
  str: 'Сила',
  dex: 'Ловкость',
  con: 'Телосложение',
  int: 'Интеллект',
  wis: 'Мудрость',
  cha: 'Харизма',
}
