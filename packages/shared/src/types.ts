export const APP_NAME = 'Стол D&D' as const
export const API_VERSION = 'v1' as const

export const SRD_ATTRIBUTION
  = 'This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.'

export type CampaignRole = 'dm' | 'player'
export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type SaveOverrides = Partial<Record<Ability, number>>
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

export const itemKinds = ['weapon', 'armor', 'shield', 'gear'] as const
export type ItemKind = (typeof itemKinds)[number]
export type GearAbility = Ability | 'finesse'

export interface WeaponStats {
  kind: 'weapon'
  dice: string
  damageType: string
  ability: GearAbility
}

export interface ArmorStats {
  kind: 'armor'
  base: number
  dexCap: number | null
}

export interface ShieldStats {
  kind: 'shield'
}

export type GearStats = WeaponStats | ArmorStats | ShieldStats

export interface InventoryItem {
  id: string
  itemId: string
  name: string
  quantity: number
  kind: ItemKind
  equipped: boolean
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

export const skills = [
  'acrobatics',
  'animal-handling',
  'arcana',
  'athletics',
  'deception',
  'history',
  'insight',
  'intimidation',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'performance',
  'persuasion',
  'religion',
  'sleight-of-hand',
  'stealth',
  'survival',
] as const

export type Skill = typeof skills[number]

export const skillAbility: Record<Skill, Ability> = {
  'acrobatics': 'dex',
  'animal-handling': 'wis',
  'arcana': 'int',
  'athletics': 'str',
  'deception': 'cha',
  'history': 'int',
  'insight': 'wis',
  'intimidation': 'cha',
  'investigation': 'int',
  'medicine': 'wis',
  'nature': 'int',
  'perception': 'wis',
  'performance': 'cha',
  'persuasion': 'cha',
  'religion': 'int',
  'sleight-of-hand': 'dex',
  'stealth': 'dex',
  'survival': 'wis',
}

export const skillLabel: Record<Skill, string> = {
  'acrobatics': 'Акробатика',
  'animal-handling': 'Уход за животными',
  'arcana': 'Магия',
  'athletics': 'Атлетика',
  'deception': 'Обман',
  'history': 'История',
  'insight': 'Проницательность',
  'intimidation': 'Запугивание',
  'investigation': 'Расследование',
  'medicine': 'Медицина',
  'nature': 'Природа',
  'perception': 'Восприятие',
  'performance': 'Выступление',
  'persuasion': 'Убеждение',
  'religion': 'Религия',
  'sleight-of-hand': 'Ловкость рук',
  'stealth': 'Скрытность',
  'survival': 'Выживание',
}
