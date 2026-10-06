import type { ClassFeature, GearAbility, GearStats, Skill } from './types'
import itemRows from './srd-2024-items.json'
import monsterRows from './srd-2024-monsters.json'
import spellRows from './srd-2024-spells.json'
import { skills } from './types'

export interface SrdSeed {
  id: string
  kind: 'class' | 'species' | 'background' | 'feat' | 'spell' | 'monster' | 'item'
  name: string
  body: Record<string, unknown>
}

const offered = (list: readonly Skill[]) => list

const skillOfferByDraft = {
  barbarian: offered(['animal-handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival']),
  bard: offered(skills),
  cleric: offered(['history', 'insight', 'medicine', 'persuasion', 'religion']),
  druid: offered(['arcana', 'animal-handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival']),
  fighter: offered(['acrobatics', 'animal-handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'persuasion', 'survival']),
  monk: offered(['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth']),
  paladin: offered(['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion']),
  ranger: offered(['animal-handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival']),
  rogue: offered(['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight-of-hand', 'stealth']),
  sorcerer: offered(['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion']),
  warlock: offered(['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion']),
  wizard: offered(['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion']),
}

const skillChoicesByDraft = {
  barbarian: 2,
  bard: 3,
  cleric: 2,
  druid: 2,
  fighter: 2,
  monk: 2,
  paladin: 2,
  ranger: 3,
  rogue: 4,
  sorcerer: 2,
  warlock: 2,
  wizard: 2,
} as const satisfies Record<keyof typeof skillOfferByDraft, number>

export function skillOfferForClass(classId: string) {
  const draftId = classId.replace(/^class-/, '')
  if (!Object.hasOwn(skillOfferByDraft, draftId))
    return null
  const id = draftId as keyof typeof skillOfferByDraft
  return {
    skillChoices: skillChoicesByDraft[id],
    skills: skillOfferByDraft[id],
  }
}

interface ClassDraft {
  id: keyof typeof skillOfferByDraft
  name: string
  hitDie: string
  saves: string[]
  casting: string | null
  subclassName: string
  weaponMastery: boolean
  spellIds: string[]
  features: ClassFeature[]
}

const classDrafts: ClassDraft[] = [
  {
    id: 'barbarian',
    name: 'Варвар',
    hitDie: 'd12',
    saves: ['str', 'con'],
    casting: null,
    subclassName: 'Путь берсерка',
    weaponMastery: true,
    spellIds: [],
    features: [
      { id: 'rage', name: 'Ярость', text: 'Бонусное действие. Сопротивление дробящему, колющему и рубящему, +2 к урону атак Силы.', subclass: false },
      { id: 'frenzy', name: 'Бешенство', text: 'Пока длится ярость, бонусным действием ещё одна рукопашная атака.', subclass: true },
    ],
  },
  {
    id: 'bard',
    name: 'Бард',
    hitDie: 'd8',
    saves: ['dex', 'cha'],
    casting: 'cha',
    subclassName: 'Коллегия знаний',
    weaponMastery: false,
    spellIds: ['healing-word', 'thunderwave'],
    features: [
      { id: 'inspiration', name: 'Вдохновение барда', text: 'Бонусное действие. Союзник получает кость d6.', formula: '1d6', subclass: false },
      { id: 'cutting-words', name: 'Острое словцо', text: 'Реакция. Вычтите кость вдохновения из броска врага.', formula: '1d6', subclass: true },
    ],
  },
  {
    id: 'cleric',
    name: 'Жрец',
    hitDie: 'd8',
    saves: ['wis', 'cha'],
    casting: 'wis',
    subclassName: 'Домен жизни',
    weaponMastery: false,
    spellIds: ['sacred-flame', 'cure-wounds', 'guiding-bolt'],
    features: [
      { id: 'channel', name: 'Божественный канал', text: 'Изгнание нежити. Нежить рядом проходит спасбросок Мудрости.', subclass: false },
      { id: 'preserve-life', name: 'Сохранение жизни', text: 'Восстановите хиты раненым существам в пределах 30 футов.', subclass: true },
    ],
  },
  {
    id: 'druid',
    name: 'Друид',
    hitDie: 'd8',
    saves: ['int', 'wis'],
    casting: 'wis',
    subclassName: 'Круг земли',
    weaponMastery: false,
    spellIds: ['cure-wounds', 'thunderwave'],
    features: [
      { id: 'wild-shape', name: 'Дикий облик', text: 'Бонусное действие. Примите облик зверя, которого видели.', subclass: false },
      { id: 'natural-recovery', name: 'Природное восстановление', text: 'На коротком отдыхе верните часть потраченных ячеек.', subclass: true },
    ],
  },
  {
    id: 'fighter',
    name: 'Воин',
    hitDie: 'd10',
    saves: ['str', 'con'],
    casting: null,
    subclassName: 'Мастер боевых искусств',
    weaponMastery: true,
    spellIds: [],
    features: [
      { id: 'second-wind', name: 'Второе дыхание', text: 'Бонусное действие. Лечение костью живучести.', formula: '1d10+1', subclass: false },
      { id: 'maneuver', name: 'Приём', text: 'Кость превосходства d8 к атаке, проверке или урону.', formula: '1d8', subclass: true },
    ],
  },
  {
    id: 'monk',
    name: 'Монах',
    hitDie: 'd8',
    saves: ['str', 'dex'],
    casting: null,
    subclassName: 'Воин открытой ладони',
    weaponMastery: false,
    spellIds: [],
    features: [
      { id: 'martial-arts', name: 'Боевые искусства', text: 'Безоружный удар или удар монашеского оружия.', formula: '1d6', subclass: false },
      { id: 'open-hand', name: 'Открытая ладонь', text: 'После шквала ударов цель падает, отлетает или теряет реакции.', subclass: true },
    ],
  },
  {
    id: 'paladin',
    name: 'Паладин',
    hitDie: 'd10',
    saves: ['wis', 'cha'],
    casting: 'cha',
    subclassName: 'Клятва преданности',
    weaponMastery: true,
    spellIds: ['cure-wounds', 'bless'],
    features: [
      { id: 'smite', name: 'Божественная кара', text: 'Трата ячейки добавляет урон излучением к рукопашной атаке.', formula: '2d8', subclass: false },
      { id: 'sacred-weapon', name: 'Священное оружие', text: 'Бонусное действие. Атаки оружием получают бонус Харизмы.', subclass: true },
    ],
  },
  {
    id: 'ranger',
    name: 'Следопыт',
    hitDie: 'd10',
    saves: ['str', 'dex'],
    casting: 'wis',
    subclassName: 'Охотник',
    weaponMastery: true,
    spellIds: ['hunters-mark', 'cure-wounds'],
    features: [
      { id: 'favored-enemy', name: 'Избранный враг', text: 'Преимущество на проверки, чтобы выследить существо.', subclass: false },
      { id: 'colossus-slayer', name: 'Убийца колоссов', text: 'Один раз за ход 1d8, если у цели уже не полные хиты.', formula: '1d8', subclass: true },
    ],
  },
  {
    id: 'rogue',
    name: 'Плут',
    hitDie: 'd8',
    saves: ['dex', 'int'],
    casting: null,
    subclassName: 'Вор',
    weaponMastery: true,
    spellIds: [],
    features: [
      { id: 'sneak-attack', name: 'Скрытая атака', text: 'Дополнительный урон, если атака с преимуществом или союзник рядом с целью.', formula: '1d6', subclass: false },
      { id: 'fast-hands', name: 'Быстрые руки', text: 'Бонусным действием ловкость рук, использование предмета или отмычки.', subclass: true },
    ],
  },
  {
    id: 'sorcerer',
    name: 'Чародей',
    hitDie: 'd6',
    saves: ['con', 'cha'],
    casting: 'cha',
    subclassName: 'Драконье чародейство',
    weaponMastery: false,
    spellIds: ['fire-bolt', 'magic-missile', 'shield'],
    features: [
      { id: 'metamagic', name: 'Метамагия', text: 'На заклинание: далёкая, усиленная или осторожная метамагия.', subclass: false },
      { id: 'elemental-affinity', name: 'Стихийное сродство', text: 'Добавьте модификатор Харизмы к урону своей стихии дракона.', subclass: true },
    ],
  },
  {
    id: 'warlock',
    name: 'Колдун',
    hitDie: 'd8',
    saves: ['wis', 'cha'],
    casting: 'cha',
    subclassName: 'Исчадие',
    weaponMastery: false,
    spellIds: ['eldritch-blast', 'hex'],
    features: [
      { id: 'patron', name: 'Покровитель', text: 'Магия исчадия. Мистический заряд и сглаз в списке заклинаний.', subclass: false },
      { id: 'dark-blessing', name: 'Тёмное благословение', text: 'Когда враг падает до 0 хитов рядом с вами, получите временные хиты.', subclass: true },
    ],
  },
  {
    id: 'wizard',
    name: 'Волшебник',
    hitDie: 'd6',
    saves: ['int', 'wis'],
    casting: 'int',
    subclassName: 'Воплотитель',
    weaponMastery: false,
    spellIds: ['fire-bolt', 'ray-of-frost', 'magic-missile', 'shield'],
    features: [
      { id: 'spellbook', name: 'Книга заклинаний', text: 'Ритуалы из книги можно читать, не тратя ячейку.', subclass: false },
      { id: 'sculpt', name: 'Перекройка заклинаний', text: 'Союзники в области вашей магии проходят спасбросок и не получают урон при успехе.', subclass: true },
    ],
  },
]

const classes: SrdSeed[] = classDrafts.map(draft => ({
  id: `class-${draft.id}`,
  kind: 'class' as const,
  name: draft.name,
  body: {
    hitDie: draft.hitDie,
    saves: draft.saves,
    casting: draft.casting,
    subclassId: `subclass-${draft.id}`,
    subclassName: draft.subclassName,
    feature: draft.features.map(item => item.name).join('. '),
    weaponMastery: draft.weaponMastery,
    skillChoices: skillChoicesByDraft[draft.id],
    skills: skillOfferByDraft[draft.id],
    spellIds: draft.spellIds.map(id => `spell-${id}`),
    features: draft.features,
  },
}))

export function readClassFeatures(body: Record<string, unknown>): ClassFeature[] {
  if (!Array.isArray(body.features))
    return []
  return body.features.flatMap((item) => {
    if (!item || typeof item !== 'object')
      return []
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.text !== 'string')
      return []
    const feature: ClassFeature = {
      id: row.id,
      name: row.name,
      text: row.text,
      subclass: row.subclass === true,
    }
    if (typeof row.formula === 'string' && row.formula.length > 0)
      feature.formula = row.formula
    return [feature]
  })
}

export function readSpellIds(body: Record<string, unknown>) {
  if (!Array.isArray(body.spellIds))
    return []
  return body.spellIds.filter((id): id is string => typeof id === 'string')
}

const species: SrdSeed[] = [
  ['dragonborn', 'Драконорождённый', 30, 'Дыхание дракона, сопротивление урону предка.'],
  ['dwarf', 'Дварф', 30, 'Тёмное зрение, стойкость дварфов, знание камня.'],
  ['elf', 'Эльф', 30, 'Тёмное зрение, острое чутьё, транс.'],
  ['gnome', 'Гном', 30, 'Тёмное зрение, гномья хитрость.'],
  ['goliath', 'Голиаф', 35, 'Мощь великана.'],
  ['halfling', 'Полурослик', 30, 'Удача, храбрость, проворство.'],
  ['human', 'Человек', 30, 'Находчивость, дополнительная черта.'],
  ['orc', 'Орк', 30, 'Адреналин, тёмное зрение.'],
  ['tiefling', 'Тифлинг', 30, 'Тёмное зрение, потустороннее наследие.'],
].map(([id, name, speed, trait]) => ({
  id: `species-${id}`,
  kind: 'species' as const,
  name: String(name),
  body: { speed, trait },
}))

const backgroundDrafts = [
  { id: 'acolyte', name: 'Послушник', feat: 'magic-initiate-cleric', abilities: ['wis', 'int'], skills: ['insight', 'religion'] },
  { id: 'criminal', name: 'Преступник', feat: 'alert', abilities: ['dex', 'con'], skills: ['sleight-of-hand', 'stealth'] },
  { id: 'sage', name: 'Мудрец', feat: 'magic-initiate-wizard', abilities: ['con', 'int'], skills: ['arcana', 'history'] },
  { id: 'soldier', name: 'Солдат', feat: 'savage-attacker', abilities: ['str', 'con'], skills: ['athletics', 'intimidation'] },
] as const satisfies readonly { abilities: readonly string[], feat: string, id: string, name: string, skills: readonly Skill[] }[]

const backgrounds: SrdSeed[] = backgroundDrafts.map(draft => ({
  id: `background-${draft.id}`,
  kind: 'background' as const,
  name: draft.name,
  body: { originFeatId: draft.feat, abilities: [...draft.abilities], skills: [...draft.skills] },
}))

const feats: SrdSeed[] = [
  ['alert', 'Бдительность', 'origin', 'Помеха к инициативе не применяется, когда вас застали врасплох. Можно поменяться инициативой с союзником.'],
  ['magic-initiate-cleric', 'Посвящённый в магию (жрец)', 'origin', 'Два заговора жреца и одно заклинание 1 круга.'],
  ['magic-initiate-wizard', 'Посвящённый в магию (волшебник)', 'origin', 'Два заговора волшебника и одно заклинание 1 круга.'],
  ['savage-attacker', 'Свирепый атакующий', 'origin', 'Один раз за ход перебросьте кости урона оружия.'],
].map(([id, name, category, text]) => ({
  id: `feat-${id}`,
  kind: 'feat' as const,
  name: String(name),
  body: { category, text },
}))

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
  },
}))

const monsters: SrdSeed[] = monsterRows.map(row => ({
  id: `monster-${row.id}`,
  kind: 'monster' as const,
  name: row.name,
  body: {
    ac: row.ac,
    hp: row.hp,
    speed: row.speed,
    cr: row.cr,
    attacks: row.attacks,
    abilities: row.abilities,
    saves: row.saves,
  },
}))

const items: SrdSeed[] = itemRows.map(row => ({
  id: `item-${row.id}`,
  kind: 'item' as const,
  name: row.name,
  body: { ...row.gear, text: row.text },
}))

const gearAbilityByKey = {
  str: 'str',
  dex: 'dex',
  finesse: 'finesse',
} as const satisfies Record<string, GearAbility>

const readGearByKind = {
  weapon: readWeaponGear,
  armor: readArmorGear,
  shield: readShieldGear,
} as const

export function readGearBody(body: Record<string, unknown> | null | undefined): GearStats | null {
  if (!body)
    return null
  const kind = body.kind
  if (typeof kind !== 'string' || !Object.hasOwn(readGearByKind, kind))
    return null
  return readGearByKind[kind as keyof typeof readGearByKind](body)
}

function readWeaponGear(body: Record<string, unknown>): GearStats | null {
  const ability = typeof body.ability === 'string' && Object.hasOwn(gearAbilityByKey, body.ability)
    ? gearAbilityByKey[body.ability as keyof typeof gearAbilityByKey]
    : null
  if (typeof body.dice !== 'string' || typeof body.damageType !== 'string' || !ability)
    return null
  return { kind: 'weapon', dice: body.dice, damageType: body.damageType, ability }
}

function readArmorGear(body: Record<string, unknown>): GearStats | null {
  if (typeof body.base !== 'number')
    return null
  if (body.dexCap != null && typeof body.dexCap !== 'number')
    return null
  return { kind: 'armor', base: body.base, dexCap: typeof body.dexCap === 'number' ? body.dexCap : null }
}

function readShieldGear(): GearStats {
  return { kind: 'shield' }
}

export const srdCatalog: SrdSeed[] = [
  ...classes,
  ...species,
  ...backgrounds,
  ...feats,
  ...spells,
  ...monsters,
  ...items,
]

function isSkill(value: unknown): value is Skill {
  return typeof value === 'string' && (skills as readonly string[]).includes(value)
}

export function backgroundSkillGrant(backgroundId: string): Skill[] {
  const entry = srdCatalog.find(item => item.id === backgroundId && item.kind === 'background')
  const list = entry?.body.skills
  if (!Array.isArray(list))
    return []
  return list.filter(isSkill)
}

export function skillChoiceForOrigin(classId: string, backgroundId: string) {
  const offer = skillOfferForClass(classId)
  if (!offer)
    return null
  const granted = backgroundSkillGrant(backgroundId)
  const grantedSet = new Set<string>(granted)
  return {
    granted,
    skillChoices: offer.skillChoices,
    skills: offer.skills.filter(skill => !grantedSet.has(skill)),
  }
}

export function acceptSkillChoice(chosen: readonly Skill[]) {
  if (new Set(chosen).size !== chosen.length)
    return null
  return [...chosen]
}

export function gearByItemId(itemId: string) {
  const entry = srdCatalog.find(item => item.id === itemId)
  const stats = readGearBody(entry?.body)
  if (!entry || !stats)
    return null
  return { name: entry.name, stats }
}
