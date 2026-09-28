import type { ClassFeature } from './types'

export interface SrdSeed {
  id: string
  kind: 'class' | 'species' | 'background' | 'feat' | 'spell' | 'monster' | 'item'
  name: string
  body: Record<string, unknown>
}

interface ClassDraft {
  id: string
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
    spellIds: ['hunter-mark', 'cure-wounds'],
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

const backgrounds: SrdSeed[] = [
  ['acolyte', 'Послушник', 'magic-initiate-cleric', 'wis', 'int'],
  ['criminal', 'Преступник', 'alert', 'dex', 'con'],
  ['sage', 'Мудрец', 'magic-initiate-wizard', 'con', 'int'],
  ['soldier', 'Солдат', 'savage-attacker', 'str', 'con'],
].map(([id, name, feat, a, b]) => ({
  id: `background-${id}`,
  kind: 'background' as const,
  name: String(name),
  body: { originFeatId: feat, abilities: [a, b] },
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

const spells: SrdSeed[] = [
  ['fire-bolt', 'Огненный снаряд', 0, '1d10', 'огонь', 'Дальнобойная атака заклинанием.'],
  ['ray-of-frost', 'Луч холода', 0, '1d8', 'холод', 'Дальнобойная атака. Скорость цели −10 футов.'],
  ['sacred-flame', 'Священное пламя', 0, '1d8', 'излучение', 'Спасбросок Ловкости.'],
  ['eldritch-blast', 'Мистический заряд', 0, '1d10', 'сила', 'Дальнобойная атака заклинанием.'],
  ['cure-wounds', 'Лечение ран', 1, '2d8', 'лечение', 'Касание. Лечит кости + модификатор заклинательной характеристики.'],
  ['healing-word', 'Лечащее слово', 1, '2d4', 'лечение', 'Бонусное действие, 60 футов.'],
  ['magic-missile', 'Волшебная стрела', 1, '3d4+3', 'сила', 'Три снаряда, попадание автоматическое.'],
  ['guiding-bolt', 'Направляющий снаряд', 1, '4d6', 'излучение', 'Дальнобойная атака. Следующая атака по цели с преимуществом.'],
  ['thunderwave', 'Волна грома', 1, '2d8', 'гром', 'Куб 15 футов. Спасбросок Телосложения.'],
  ['shield', 'Щит', 1, '', 'защита', 'Реакция. +5 КД до начала вашего следующего хода.'],
  ['bless', 'Благословение', 1, '1d4', 'поддержка', 'До трёх существ добавляют d4 к атакам и спасброскам.'],
  ['hunter-mark', 'Метка охотника', 1, '1d6', 'сила', 'Дополнительный урон по отмеченной цели.'],
  ['hex', 'Сглаз', 1, '1d6', 'некротика', 'Дополнительный урон и помеха одной характеристике.'],
  ['misty-step', 'Туманный шаг', 2, '', 'телепорт', 'Бонусное действие. Телепорт на 30 футов.'],
  ['hold-person', 'Удержание личности', 2, '', 'очарование', 'Спасбросок Мудрости, иначе паралич.'],
  ['fireball', 'Огненный шар', 3, '8d6', 'огонь', 'Сфера 20 футов. Спасбросок Ловкости.'],
  ['counterspell', 'Контрзаклинание', 3, '', 'ограждение', 'Реакция. Прерывает заклинание.'],
  ['revivify', 'Оживление', 3, '', 'некромантия', 'Возвращает к жизни существо, умершее в последнюю минуту.'],
].map(([id, name, level, dice, damageType, text]) => ({
  id: `spell-${id}`,
  kind: 'spell' as const,
  name: String(name),
  body: { level: Number(level), dice, damageType, text },
}))

const monsters: SrdSeed[] = [
  monster('goblin-warrior', 'Гоблин-воин', 15, 12, 7, [
    attack('scimitar', 'Скимитар', 4, '1d6', 2, 'рубящий'),
    attack('shortbow', 'Короткий лук', 4, '1d6', 2, 'колющий'),
  ]),
  monster('wolf', 'Волк', 13, 11, 2, [
    attack('bite', 'Укус', 4, '2d4', 2, 'колющий'),
  ]),
  monster('skeleton', 'Скелет', 13, 13, 2, [
    attack('shortsword', 'Короткий меч', 4, '1d6', 2, 'колющий'),
    attack('shortbow', 'Короткий лук', 4, '1d6', 2, 'колющий'),
  ]),
  monster('zombie', 'Зомби', 8, 15, -2, [
    attack('slam', 'Удар', 3, '1d6', 1, 'дробящий'),
  ]),
  monster('guard', 'Стражник', 16, 11, 1, [
    attack('spear', 'Копьё', 3, '1d6', 1, 'колющий'),
  ]),
  monster('hobgoblin', 'Хобгоблин-воин', 18, 11, 3, [
    attack('longsword', 'Длинный меч', 3, '1d8', 1, 'рубящий'),
  ]),
  monster('owlbear', 'Совомед', 13, 59, 2, [
    attack('beak', 'Клюв', 7, '1d10', 5, 'колющий'),
    attack('claws', 'Когти', 7, '2d8', 5, 'рубящий'),
  ]),
  monster('ogre', 'Огр', 11, 68, 1, [
    attack('greatclub', 'Палица', 6, '2d8', 4, 'дробящий'),
  ]),
  monster('dire-wolf', 'Лютый волк', 14, 22, 2, [
    attack('bite', 'Укус', 5, '1d10', 3, 'колющий'),
  ]),
  monster('ghoul', 'Упырь', 12, 22, 2, [
    attack('claws', 'Когти', 4, '2d4', 2, 'рубящий'),
    { id: 'paralyze', name: 'Паралич укуса', attackBonus: 0, damageDice: '0', damageBonus: 0, damageType: 'спасбросок Телосложения Сл 10' },
  ]),
]

function attack(id: string, name: string, attackBonus: number, damageDice: string, damageBonus: number, damageType: string) {
  return { id, name, attackBonus, damageDice, damageBonus, damageType }
}

function monster(id: string, name: string, ac: number, hp: number, initiative: number, attacks: ReturnType<typeof attack>[]): SrdSeed {
  return {
    id: `monster-${id}`,
    kind: 'monster',
    name,
    body: { ac, hp, initiative, speed: 30, attacks },
  }
}

const items: SrdSeed[] = [
  ['longsword', 'Длинный меч', '1d8', 'рубящий', 'Универсальное (1d10). Мастерство: отталкивание.'],
  ['shortsword', 'Короткий меч', '1d6', 'колющий', 'Лёгкое, фехтовальное. Мастерство: дразнящее.'],
  ['rapier', 'Рапира', '1d8', 'колющий', 'Фехтовальное. Мастерство: дразнящее.'],
  ['greataxe', 'Секира', '1d12', 'рубящий', 'Тяжёлое, двуручное. Мастерство: рассечение.'],
  ['shortbow', 'Короткий лук', '1d6', 'колющий', 'Дальность 80/320. Мастерство: дразнящее.'],
  ['leather', 'Кожаный доспех', '', '', 'КД 11 + Ловкость.'],
  ['chain-shirt', 'Кольчужная рубаха', '', '', 'КД 13 + Ловкость (макс. 2).'],
  ['shield', 'Щит', '', '', '+2 КД.'],
].map(([id, name, dice, damageType, text]) => ({
  id: `item-${id}`,
  kind: 'item' as const,
  name: String(name),
  body: { dice, damageType, text },
}))

export const srdCatalog: SrdSeed[] = [
  ...classes,
  ...species,
  ...backgrounds,
  ...feats,
  ...spells,
  ...monsters,
  ...items,
]
