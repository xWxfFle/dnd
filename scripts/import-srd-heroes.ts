/* eslint-disable style/quote-props */

export interface HeroFeature {
  id: string
  name: string
  text: string
  level: number
  formula?: string
}

export interface ClassTable {
  id: string
  name: string
  values: Record<string, string>
}

export interface ClassRow {
  id: string
  name: string
  hitDie: string
  saves: string[]
  casting: string | null
  unarmored: 'con' | 'wis' | null
  weaponMastery: boolean
  skillChoices: number
  skills: string[]
  spellIds: string[]
  subclassLevel: number
  asiLevels: number[]
  features: HeroFeature[]
  tables: ClassTable[]
}

export interface SubclassRow {
  id: string
  classId: string
  name: string
  features: HeroFeature[]
}

export interface FeatRow {
  id: string
  name: string
  category: 'asi' | 'origin' | 'fighting-style' | 'epic-boon' | 'general'
  text: string
}

export interface BackgroundRow {
  id: string
  name: string
  originFeatId: string
  abilities: string[]
  skills: string[]
}

const backgroundRu: Record<string, string> = {
  acolyte: 'Послушник',
  criminal: 'Преступник',
  sage: 'Мудрец',
  soldier: 'Солдат',
}

const classRu: Record<string, string> = {
  barbarian: 'Варвар',
  bard: 'Бард',
  cleric: 'Жрец',
  druid: 'Друид',
  fighter: 'Воин',
  monk: 'Монах',
  paladin: 'Паладин',
  ranger: 'Следопыт',
  rogue: 'Плут',
  sorcerer: 'Чародей',
  warlock: 'Колдун',
  wizard: 'Волшебник',
}

const subclassRu: Record<string, string> = {
  'path-of-the-berserker': 'Путь берсерка',
  'college-of-lore': 'Коллегия знаний',
  'life-domain': 'Домен жизни',
  'circle-of-the-land': 'Круг земли',
  champion: 'Чемпион',
  'warrior-of-the-open-hand': 'Воин открытой ладони',
  'oath-of-devotion': 'Клятва преданности',
  hunter: 'Охотник',
  thief: 'Вор',
  'draconic-sorcery': 'Драконье чародейство',
  'fiend-patron': 'Исчадие',
  evoker: 'Воплотитель',
}

const featRu: Record<string, string> = {
  'ability-score-improvement': 'Увеличение характеристик',
  alert: 'Бдительность',
  archery: 'Стрельба',
  'boon-of-combat-prowess': 'Дар боевого мастерства',
  'boon-of-dimensional-travel': 'Дар пространственного путешествия',
  'boon-of-fate': 'Дар судьбы',
  'boon-of-irresistible-offense': 'Дар неотразимого натиска',
  'boon-of-spell-recall': 'Дар припоминания заклинаний',
  'boon-of-the-night-spirit': 'Дар ночного духа',
  'boon-of-truesight': 'Дар истинного зрения',
  defense: 'Оборона',
  grappler: 'Борец',
  'great-weapon-fighting': 'Сражение большим оружием',
  'magic-initiate': 'Посвящённый в магию',
  'savage-attacker': 'Свирепый атакующий',
  skilled: 'Умелец',
  'two-weapon-fighting': 'Сражение двумя оружиями',
}

const featureRu: Record<string, string> = {
  'abjure foes': 'Изгнание врагов',
  'acrobatic movement': 'Акробатическое движение',
  'action surge': 'Всплеск действий',
  'additional fighting style': 'Дополнительный боевой стиль',
  'arcane apotheosis': 'Мистический апофеоз',
  'archdruid': 'Архидруид',
  'aura expansion': 'Расширение ауры',
  'aura of courage': 'Аура отваги',
  'aura of devotion': 'Аура преданности',
  'aura of protection': 'Аура защиты',
  'bard spell list': 'Список заклинаний барда',
  'beast spells': 'Заклинания зверя',
  'body and mind': 'Тело и разум',
  'blessed strikes': 'Благословенные удары',
  'cantrips known': 'Заговоры',
  'magic cunning': 'Магическая хитрость',
  'studdied attacks': 'Изученные атаки',
  'bonus proficiencies': 'Дополнительные владения',
  'circle of the land spells': 'Заклинания круга земли',
  'cleric spell list': 'Список заклинаний жреца',
  'cleric subclasses': 'Подклассы жреца',
  'contact patron': 'Связь с покровителем',
  'countercharm': 'Контрчары',
  'cunning action': 'Хитрое действие',
  'cunning strike': 'Хитрый удар',
  'dark one\'s own luck': 'Удача тёмного',
  'defensive tactics': 'Оборонительная тактика',
  'deflect attacks': 'Отклонение атак',
  'deflect energy': 'Отклонение энергии',
  'deft explorer': 'Искусный исследователь',
  'devious strikes': 'Коварные удары',
  'disciple of life': 'Ученик жизни',
  'disciplined survivor': 'Дисциплинированный выживший',
  'dragon companion': 'Драконий спутник',
  'dragon wings': 'Драконьи крылья',
  'druid spell list': 'Список заклинаний друида',
  druidic: 'Друидический язык',
  elusive: 'Неуловимость',
  evasion: 'Уклонение',
  expertise: 'Компетентность',
  'elemental fury': 'Стихийная ярость',
  'eldritch master': 'Мистический мастер',
  'empowered evocation': 'Усиленное воплощение',
  'empowered strikes': 'Усиленные удары',
  'faithful steed': 'Верный скакун',
  'feral senses': 'Звериные чувства',
  'fiend spells': 'Заклинания исчадия',
  'fiendish resilience': 'Стойкость исчадия',
  'fighting style': 'Боевой стиль',
  'fleet step': 'Быстрый шаг',
  'foe slayer': 'Губитель врагов',
  'font of inspiration': 'Источник вдохновения',
  'font of magic': 'Источник магии',
  'greater divine intervention': 'Великое божественное вмешательство',
  'heightened focus': 'Усиленное сосредоточение',
  'heroic warrior': 'Героический воин',
  'holy nimbus': 'Святой нимб',
  'hurl through hell': 'Бросок сквозь ад',
  'improved blessed strikes': 'Улучшенные благословенные удары',
  'improved critical': 'Улучшенный крит',
  'improved cunning strike': 'Улучшенный хитрый удар',
  'improved elemental fury': 'Улучшенная стихийная ярость',
  'indomitable': 'Непреклонный',
  'innate sorcery': 'Врождённое чародейство',
  'intimidating presence': 'Устрашающее присутствие',
  'land\'s aid': 'Помощь земли',
  'magical cunning': 'Магическая хитрость',
  'magical discoveries': 'Магические открытия',
  'memorize spell': 'Запомнить заклинание',
  'mindless rage': 'Безумная ярость',
  'monk\'s focus': 'Сосредоточенность монаха',
  'mystic arcanum': 'Мистический арканум',
  'nature\'s sanctuary': 'Святилище природы',
  'nature\'s veil': 'Покров природы',
  'nature\'s ward': 'Страж природы',
  'oath of devotion spells': 'Заклинания клятвы преданности',
  overchannel: 'Перегрузка',
  'pact magic': 'Магия договора',
  'paladin spell list': 'Список заклинаний паладина',
  'paladin\'s smite': 'Кара паладина',
  'peerless skill': 'Безупречный навык',
  'perfect focus': 'Идеальная сосредоточенность',
  'precise hunter': 'Точный охотник',
  'primal order': 'Изначальный чин',
  'quivering palm': 'Дрожащая ладонь',
  'radiant strikes': 'Сияющие удары',
  'ranger spell list': 'Список заклинаний следопыта',
  'relentless hunter': 'Неумолимый охотник',
  'relentless rage': 'Неумолимая ярость',
  'reliable talent': 'Надёжный талант',
  'restoring touch': 'Исцеляющее касание',
  retaliation: 'Возмездие',
  'ritual adept': 'Адепт ритуалов',
  roving: 'Странствие',
  scholar: 'Учёный',
  'sear undead': 'Опаление нежити',
  'second-story work': 'Работа на втором этаже',
  'self-restoration': 'Самовосстановление',
  'signature spells': 'Фирменные заклинания',
  'slippery mind': 'Скользкий ум',
  'slow fall': 'Замедленное падение',
  'smite of protection': 'Кара защиты',
  'sorcerer spell list': 'Список заклинаний чародея',
  'sorcerous restoration': 'Чародейское восстановление',
  'sorcery incarnate': 'Воплощённое чародейство',
  'spell mastery': 'Мастерство заклинаний',
  'steady aim': 'Верный прицел',
  'stroke of luck': 'Поворот удачи',
  'studied attacks': 'Изученные атаки',
  'stunning strike': 'Ошеломляющий удар',
  'superior critical': 'Превосходный крит',
  'superior defense': 'Превосходная защита',
  'superior hunter\'s defense': 'Превосходная защита охотника',
  'superior hunter\'s prey': 'Превосходная добыча охотника',
  'superior inspiration': 'Превосходное вдохновение',
  'supreme healing': 'Высшее исцеление',
  'supreme sneak': 'Высшая скрытность',
  survivor: 'Выживший',
  'tactical master': 'Тактический мастер',
  'tactical mind': 'Тактический ум',
  'tactical shift': 'Тактический сдвиг',
  'thief\'s reflexes': 'Рефлексы вора',
  'three extra attacks': 'Три дополнительные атаки',
  tireless: 'Неутомимый',
  'two extra attacks': 'Две дополнительные атаки',
  'uncanny dodge': 'Невероятное уклонение',
  'uncanny metabolism': 'Невероятный обмен веществ',
  'unarmoed movement': 'Движение без доспехов',
  'use magic device': 'Использование магических предметов',
  'warlock spell list': 'Список заклинаний колдуна',
  'wholeness of body': 'Цельность тела',
  'wild companion': 'Дикий спутник',
  'wild resurgence': 'Дикий подъём',
  'wizard spell list': 'Список заклинаний волшебника',
  'words of creation': 'Слова творения',

  'ability score improvement': 'Увеличение характеристик',
  'arcane recovery': 'Мистическое восстановление',
  'bardic inspiration': 'Вдохновение барда',
  'barbarian subclass': 'Подкласс варвара',
  'bard subclass': 'Подкласс барда',
  'blessed healer': 'Благословенный целитель',
  'brutal strike': 'Жестокий удар',
  'channel divinity': 'Божественный канал',
  'cleric subclass': 'Подкласс жреца',
  'colossus slayer': 'Убийца колоссов',
  'core barbarian traits': 'Основные черты варвара',
  'cutting words': 'Острое словцо',
  'danger sense': 'Чувство опасности',
  'dark one\'s blessing': 'Благословение тёмного',
  'divine intervention': 'Божественное вмешательство',
  'divine order': 'Божественный чин',
  'divine smite': 'Божественная кара',
  'druid subclass': 'Подкласс друида',
  'draconic resilience': 'Драконья стойкость',
  'draconic spells': 'Заклинания дракона',
  'elemental affinity': 'Стихийное сродство',
  'eldritch invocations': 'Мистические воззвания',
  'epic boon': 'Эпический дар',
  'evocation savant': 'Знаток воплощения',
  'extra attack': 'Дополнительная атака',
  'fast hands': 'Быстрые руки',
  'fast movement': 'Быстрое движение',
  'favored enemy': 'Избранный враг',
  'feral instinct': 'Звериный инстинкт',
  'fighter subclass': 'Подкласс воина',
  frenzy: 'Бешенство',
  'hunter\'s lore': 'Знание охотника',
  'hunter\'s prey': 'Добыча охотника',
  'improved brutal strike': 'Улучшенный жестокий удар',
  'improved brutal strike (enhanced)': 'Усиленный жестокий удар',
  'indomitable might': 'Непреклонная мощь',
  'instinctive pounce': 'Инстинктивный прыжок',
  'jack of all trades': 'Мастер на все руки',
  'lay on hands': 'Возложение рук',
  'life domain spells': 'Заклинания домена жизни',
  'magical secrets': 'Магические тайны',
  'martial arts': 'Боевые искусства',
  metamagic: 'Метамагия',
  'monk subclass': 'Подкласс монаха',
  'natural recovery': 'Природное восстановление',
  'open hand technique': 'Техника открытой ладони',
  'paladin subclass': 'Подкласс паладина',
  'persistent rage': 'Стойкая ярость',
  'potent cantrip': 'Мощный заговор',
  'preserve life': 'Сохранение жизни',
  'primal champion': 'Изначальный защитник',
  'primal knowledge': 'Изначальное знание',
  'proficiency bonus': 'Бонус мастерства',
  rage: 'Ярость',
  'rage damage': 'Урон ярости',
  rages: 'Ярости',
  'ranger subclass': 'Подкласс следопыта',
  'reckless attack': 'Безрассудная атака',
  'remarkable athlete': 'Выдающийся атлет',
  'rogue subclass': 'Подкласс плута',
  'sacred weapon': 'Священное оружие',
  'sculpt spells': 'Перекройка заклинаний',
  'second wind': 'Второе дыхание',
  'sneak attack': 'Скрытая атака',
  'sorcerer subclass': 'Подкласс чародея',
  'sorcery points': 'Единицы чародейства',
  'spellcasting': 'Применение заклинаний',
  'thieves\' cant': 'Воровской жаргон',
  'unarmored defense': 'Защита без доспехов',
  'unarmored movement': 'Движение без доспехов',
  'warlock subclass': 'Подкласс колдуна',
  'weapon mastery': 'Мастерство оружия',
  'wild shape': 'Дикий облик',
  'wizard subclass': 'Подкласс волшебника',
  'word of misfortune': 'Слово неудачи',
}

const tableRu: Record<string, string> = {
  rages: 'Ярость',
  'rage-damage': 'Урон ярости',
  'weapon-mastery': 'Мастерство оружия',
  'sneak-attack': 'Скрытая атака',
  'bardic-die': 'Кость вдохновения',
  'martial-arts': 'Боевые искусства',
  'focus-points': 'Очки сосредоточенности',
  'sorcery-points': 'Единицы чародейства',
  'cantrips-known': 'Заговоры',
  'prepared-spells': 'Подготовленные заклинания',
  'invocations-known': 'Воззвания',
}

const skillNameToId: Record<string, string> = {
  acrobatics: 'acrobatics',
  'animal handling': 'animal-handling',
  arcana: 'arcana',
  athletics: 'athletics',
  deception: 'deception',
  history: 'history',
  insight: 'insight',
  intimidation: 'intimidation',
  investigation: 'investigation',
  medicine: 'medicine',
  nature: 'nature',
  perception: 'perception',
  performance: 'performance',
  persuasion: 'persuasion',
  religion: 'religion',
  'sleight of hand': 'sleight-of-hand',
  stealth: 'stealth',
  survival: 'survival',
}

const saveNameToId: Record<string, string> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
}

const castingByClass: Record<string, string> = {
  bard: 'cha',
  cleric: 'wis',
  druid: 'wis',
  paladin: 'cha',
  ranger: 'wis',
  sorcerer: 'cha',
  warlock: 'cha',
  wizard: 'int',
}

const unarmoredByClass: Record<string, 'con' | 'wis'> = {
  barbarian: 'con',
  monk: 'wis',
}

const classSpellIds: Record<string, string[]> = {
  bard: ['healing-word', 'thunderwave'],
  cleric: ['sacred-flame', 'cure-wounds', 'guiding-bolt'],
  druid: ['cure-wounds', 'thunderwave'],
  paladin: ['cure-wounds', 'bless'],
  ranger: ['hunters-mark', 'cure-wounds'],
  sorcerer: ['fire-bolt', 'magic-missile', 'shield'],
  warlock: ['eldritch-blast', 'hex'],
  wizard: ['fire-bolt', 'ray-of-frost', 'magic-missile', 'shield'],
}

const allSkills = Object.values(skillNameToId)

const featCategoryById = {
  'ability-score-improvement': 'asi',
  archery: 'fighting-style',
  defense: 'fighting-style',
  'great-weapon-fighting': 'fighting-style',
  'two-weapon-fighting': 'fighting-style',
  alert: 'origin',
  grappler: 'origin',
  'magic-initiate': 'origin',
  'savage-attacker': 'origin',
  skilled: 'origin',
} as const satisfies Record<string, FeatRow['category']>

function featCategoryOf(id: string): FeatRow['category'] {
  if (id.startsWith('boon-'))
    return 'epic-boon'
  return featCategoryById[id] ?? 'general'
}

function slugOf(key: string) {
  return key.replace(/^srd-2024_/, '')
}

function cleanText(value: string) {
  return value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 1400)
}

function cell(desc: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = desc.match(new RegExp(`\\|${escaped}\\|([^\\|]+)\\|`, 'i'))
  return match?.[1]?.replace(/\s+/g, ' ').trim() ?? ''
}

function parseSkills(line: string): { skillChoices: number, skills: string[] } {
  const any = line.match(/choose any (\d+)/i)
  if (any)
    return { skillChoices: Number(any[1]), skills: [...allSkills] }
  const numbered = line.match(/choose (\d+):\s*(.+)/i)
  if (!numbered)
    return { skillChoices: 2, skills: [...allSkills] }
  const names = numbered[2]
    .replace(/\bor\b/gi, ',')
    .split(',')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)
  const skills = names.flatMap(name => skillNameToId[name] ? [skillNameToId[name]] : [])
  return { skillChoices: Number(numbered[1]), skills }
}

function parseSaves(line: string) {
  return line
    .toLowerCase()
    .split(/[^a-z]+/)
    .flatMap(word => saveNameToId[word] ? [saveNameToId[word]] : [])
}

function benefitDesc(row: Record<string, unknown>, type: string) {
  if (!Array.isArray(row.benefits))
    return ''
  const item = row.benefits.find(entry => entry && typeof entry === 'object' && (entry as { type?: string }).type === type) as { desc?: string } | undefined
  return String(item?.desc ?? '')
}

function parseBackgroundSkills(line: string) {
  return line
    .toLowerCase()
    .replace(/\band\b/g, ',')
    .split(',')
    .map(part => part.trim())
    .flatMap(name => skillNameToId[name] ? [skillNameToId[name]] : [])
}

function parseFeatSlug(line: string) {
  const slug = line.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (slug.startsWith('magic-initiate'))
    return 'magic-initiate'
  return slug
}

function parseHitDie(line: string) {
  const match = line.match(/d(\d+)/i)
  return match ? `d${match[1]}` : 'd8'
}

const featureIdRu: Record<string, string> = {
  'cantrips-known': 'Дикий облик',
  'magic-cunning': 'Магическая хитрость',
  'studdied-attacks': 'Изученные атаки',
}

function isWildShapeMislabel(name: string, desc: string) {
  return /cantrips known/i.test(name) && /shape-shift|wild shape|beast form/i.test(desc)
}

function translateFeature(name: string) {
  const key = name.trim().toLowerCase()
  if (featureRu[key])
    return featureRu[key]
  return name
}

function formulaOf(desc: string) {
  const match = desc.match(/(\d+d\d+)/i)
  return match?.[1]
}

function tableValues(rows: Array<{ level?: number, column_value?: string }>) {
  const values: Record<string, string> = {}
  for (const row of rows) {
    if (typeof row.level !== 'number' || row.column_value == null)
      continue
    values[String(row.level)] = String(row.column_value)
  }
  return values
}

interface OpenFeature {
  key?: string
  name?: string
  desc?: string
  feature_type?: string
  gained_at?: Array<{ level?: number }>
  data_for_class_table?: Array<{ level?: number, column_value?: string }>
}

function readFeatures(raw: OpenFeature[], kind: 'class' | 'subclass') {
  const features: HeroFeature[] = []
  const tables: ClassTable[] = []
  let subclassLevel = 3
  const asiLevels: number[] = []
  for (const item of raw) {
    const type = String(item.feature_type ?? '')
    const english = String(item.name ?? '')
    const id = slugOf(String(item.key ?? english)).split('_').at(-1) ?? slugOf(english)
    if (type === 'CLASS_TABLE_DATA' || type === 'PROFICIENCY_BONUS') {
      const values = tableValues(item.data_for_class_table ?? [])
      if (Object.keys(values).length > 0) {
        tables.push({
          id: slugOf(id),
          name: tableRu[slugOf(id)] ?? translateFeature(english),
          values,
        })
      }
      continue
    }
    if (type !== 'CLASS_LEVEL_FEATURE')
      continue
    const levels = (item.gained_at ?? []).map(row => row.level).filter((level): level is number => typeof level === 'number').sort((a, b) => a - b)
    const level = levels[0] ?? 1
    if (/subclass/i.test(english) && kind === 'class') {
      subclassLevel = level
      continue
    }
    if (/spell list/i.test(english) || /^core .+ traits$/i.test(english) || /spell slots/i.test(english) || /slot level/i.test(english))
      continue
    if (/ability score improvement/i.test(english) || /epic boon/i.test(english)) {
      asiLevels.push(...levels)
      continue
    }
    const desc = String(item.desc ?? '')
    const formula = formulaOf(desc)
    const name = featureIdRu[slugOf(id)] ?? (isWildShapeMislabel(english, desc) ? 'Дикий облик' : translateFeature(english))
    const feature: HeroFeature = {
      id,
      name,
      text: cleanText(desc),
      level,
    }
    if (formula)
      feature.formula = formula
    features.push(feature)
  }
  features.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'))
  return { features, tables, subclassLevel, asiLevels: [...new Set(asiLevels)].sort((a, b) => a - b) }
}

export async function importHeroes(paginate: <T>(url: string) => Promise<T[]>, open5e: string) {
  const rows = await paginate<Record<string, unknown>>(`${open5e}/classes/?document__key__in=srd-2024&limit=50`)
  const featsRaw = await paginate<Record<string, unknown>>(`${open5e}/feats/?document__key__in=srd-2024&limit=50`)
  const backgroundsRaw = await paginate<Record<string, unknown>>(`${open5e}/backgrounds/?document__key__in=srd-2024&limit=50`)
  const classes: ClassRow[] = []
  const subclasses: SubclassRow[] = []
  const latin: string[] = []
  for (const row of rows) {
    const id = slugOf(String(row.key ?? ''))
    const parent = row.subclass_of && typeof row.subclass_of === 'object'
      ? slugOf(String((row.subclass_of as { key?: string }).key ?? ''))
      : ''
    const featuresRaw = Array.isArray(row.features) ? row.features as OpenFeature[] : []
    const parsed = readFeatures(featuresRaw, parent ? 'subclass' : 'class')
    const english = String(row.name ?? id)
    if (parent) {
      const name = subclassRu[id] ?? english
      if (!subclassRu[id])
        latin.push(`subclass ${id} | ${english}`)
      subclasses.push({
        id,
        classId: parent,
        name,
        features: parsed.features,
      })
      continue
    }
    const core = featuresRaw.find(item => item.feature_type === 'CORE_TRAITS_TABLE')
    const desc = String(core?.desc ?? '')
    const skills = parseSkills(cell(desc, 'Skill Proficiencies'))
    const name = classRu[id] ?? english
    if (!classRu[id])
      latin.push(`class ${id} | ${english}`)
    classes.push({
      id,
      name,
      hitDie: parseHitDie(cell(desc, 'Hit Point Die')),
      saves: parseSaves(cell(desc, 'Saving Throw Proficiencies')),
      casting: castingByClass[id] ?? null,
      unarmored: unarmoredByClass[id] ?? null,
      weaponMastery: parsed.tables.some(table => table.id === 'weapon-mastery')
        || /weapon mastery/i.test(desc)
        || parsed.features.some(item => /мастерство оружия|weapon mastery/i.test(item.name)),
      skillChoices: skills.skillChoices,
      skills: skills.skills,
      spellIds: (classSpellIds[id] ?? []).map(spell => `spell-${spell}`),
      subclassLevel: parsed.subclassLevel,
      asiLevels: parsed.asiLevels,
      features: parsed.features,
      tables: parsed.tables,
    })
  }
  const feats: FeatRow[] = featsRaw.flatMap((row) => {
    const id = slugOf(String(row.key ?? row.name ?? ''))
    if (!id)
      return []
    const english = String(row.name ?? id)
    const name = featRu[id] ?? english
    if (!featRu[id])
      latin.push(`feat ${id} | ${english}`)
    const category = featCategoryOf(id)
    return [{
      id,
      name,
      category,
      text: cleanText(String(row.desc ?? '')),
    }]
  })
  classes.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  subclasses.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  feats.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const backgrounds: BackgroundRow[] = []
  for (const row of backgroundsRaw) {
    const key = String(row.key ?? '')
    const detailed = Array.isArray(row.benefits) && row.benefits.length > 0
      ? row
      : await (await fetch(`${open5e}/backgrounds/${key}/`)).json() as Record<string, unknown>
    const id = slugOf(key || String(detailed.name ?? ''))
    if (!id)
      continue
    const english = String(detailed.name ?? row.name ?? id)
    const name = backgroundRu[id] ?? english
    if (!backgroundRu[id])
      latin.push(`background ${id} | ${english}`)
    const featSlug = parseFeatSlug(benefitDesc(detailed, 'feat'))
    backgrounds.push({
      id,
      name,
      originFeatId: featSlug ? `feat-${featSlug}` : '',
      abilities: parseSaves(benefitDesc(detailed, 'ability_score')),
      skills: parseBackgroundSkills(benefitDesc(detailed, 'skill_proficiency')),
    })
  }
  backgrounds.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  const latinFeatures = [...classes, ...subclasses].flatMap(row => row.features.filter(item => /[a-z]/i.test(item.name)).map(item => `${row.id}/${item.id} | ${item.name}`))
  return { backgrounds, classes, subclasses, feats, latin: [...latin, ...latinFeatures] }
}
