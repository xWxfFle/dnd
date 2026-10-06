/* eslint-disable style/quote-props */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { importDndSuClasses } from './import-dndsu-classes'
import { importHeroes } from './import-srd-heroes'

const open5e = 'https://api.open5e.com/v2'
const etignisUrl = 'https://raw.githubusercontent.com/Etignis/DnD_SpellList_eng_rus/master/spells/allSpells.js'
const outDir = path.resolve('packages/shared/src')

const damageRu: Record<string, string> = {
  slashing: 'рубящий',
  piercing: 'колющий',
  bludgeoning: 'дробящий',
  fire: 'огонь',
  cold: 'холод',
  lightning: 'молния',
  thunder: 'звук',
  acid: 'кислота',
  poison: 'яд',
  necrotic: 'некротический',
  radiant: 'излучение',
  force: 'силовой',
  psychic: 'психический',
}

const schoolRu: Record<string, string> = {
  abjuration: 'ограждение',
  conjuration: 'вызов',
  divination: 'прорицание',
  enchantment: 'очарование',
  evocation: 'воплощение',
  illusion: 'иллюзия',
  necromancy: 'некромантия',
  transmutation: 'преобразование',
}

const propertyRu: Record<string, string> = {
  ammunition: 'боеприпасы',
  finesse: 'фехтовальное',
  heavy: 'тяжёлое',
  light: 'лёгкое',
  loading: 'заряжаемое',
  reach: 'досягаемость',
  special: 'особое',
  thrown: 'метательное',
  'two-handed': 'двуручное',
  versatile: 'универсальное',
  topple: 'мастерство: опрокидывание',
  sap: 'мастерство: оглушение',
  slow: 'мастерство: замедление',
  nick: 'мастерство: засечка',
  graze: 'мастерство: касание',
  cleave: 'мастерство: рассечение',
  push: 'мастерство: отталкивание',
  vex: 'мастерство: дразнящее',
}

const weaponRu: Record<string, string> = {
  club: 'Дубинка',
  dagger: 'Кинжал',
  greatclub: 'Палица',
  handaxe: 'Ручной топор',
  javelin: 'Метательное копьё',
  'light hammer': 'Лёгкий молот',
  mace: 'Булава',
  quarterstaff: 'Боевой посох',
  sickle: 'Серп',
  spear: 'Копьё',
  dart: 'Дротик',
  'light crossbow': 'Лёгкий арбалет',
  shortbow: 'Короткий лук',
  sling: 'Праща',
  battleaxe: 'Боевой топор',
  flail: 'Цеп',
  glaive: 'Глефа',
  greataxe: 'Секира',
  greatsword: 'Двуручный меч',
  halberd: 'Алебарда',
  lance: 'Пика',
  longsword: 'Длинный меч',
  maul: 'Молот',
  morningstar: 'Моргенштерн',
  pike: 'Протазан',
  rapier: 'Рапира',
  scimitar: 'Скимитар',
  shortsword: 'Короткий меч',
  trident: 'Трезубец',
  'war pick': 'Боевая кирка',
  warhammer: 'Боевой молот',
  whip: 'Кнут',
  blowgun: 'Духовая трубка',
  'hand crossbow': 'Ручной арбалет',
  'heavy crossbow': 'Тяжёлый арбалет',
  longbow: 'Длинный лук',
  musket: 'Мушкет',
  pistol: 'Пистолет',
  net: 'Сеть',
}

const armorRu: Record<string, string> = {
  padded: 'Стёганый доспех',
  leather: 'Кожаный доспех',
  'studded leather': 'Проклёпанный кожаный доспех',
  hide: 'Шкурный доспех',
  'chain shirt': 'Кольчужная рубаха',
  'scale mail': 'Чешуйчатый доспех',
  breastplate: 'Нагрудник',
  'half plate': 'Полулаты',
  'ring mail': 'Колечный доспех',
  'chain mail': 'Кольчуга',
  splint: 'Наборный доспех',
  plate: 'Латы',
  shield: 'Щит',
}

const spellRuExtra: Record<string, string> = {
  'acid arrow': 'Кислотная стрела',
  'arcane hand': 'Длань чародея',
  'arcane sword': 'Волшебный меч',
  'arcane vigor': 'Мистическая бодрость',
  'arcanist\'s magic aura': 'Магическая аура чародея',
  befuddlement: 'Слабоумие',
  'black tentacles': 'Чёрные щупальца',
  'divine smite': 'Божественная кара',
  elementalism: 'Стихийность',
  'faithful hound': 'Верный пёс',
  'floating disk': 'Парящий диск',
  'fount of moonlight': 'Источник лунного света',
  'freezing sphere': 'Замораживающая сфера',
  'hideous laughter': 'Жуткий смех',
  'instant summons': 'Мгновенные призывы',
  'irresistible dance': 'Неудержимый танец',
  'jallarzi\'s storm of radiance': 'Буря сияния Джалларзи',
  'magnificent mansion': 'Великолепный особняк',
  'private sanctum': 'Частное святилище',
  'resilient sphere': 'Устойчивая сфера',
  'secret chest': 'Тайный сундук',
  'shining smite': 'Сияющая кара',
  'sorcerous burst': 'Чародейский взрыв',
  'starry wisp': 'Звёздный огонёк',
  'summon dragon': 'Призыв дракона',
  'tasha\'s bubbling cauldron': 'Бурлящий котёл Таши',
  'telepathic bond': 'Телепатическая связь',
  'tiny hut': 'Крошечная хижина',
  'yolande\'s regal presence': 'Царственное присутствие Йоланды',
}

const spellAlias: Record<string, string> = {
  'acid arrow': 'melf\'s acid arrow',
  'arcane hand': 'bigby\'s hand',
  'arcane sword': 'mordenkainen\'s sword',
  'arcanist\'s magic aura': 'nystul\'s magic aura',
  befuddlement: 'feeblemind',
  'black tentacles': 'evard\'s black tentacles',
  'faithful hound': 'mordenkainen\'s faithful hound',
  'floating disk': 'tenser\'s floating disk',
  'freezing sphere': 'otiluke\'s freezing sphere',
  'hideous laughter': 'tasha\'s hideous laughter',
  'instant summons': 'drawmij\'s instant summons',
  'irresistible dance': 'otto\'s irresistible dance',
  'magnificent mansion': 'mordenkainen\'s magnificent mansion',
  'private sanctum': 'mordenkainen\'s private sanctum',
  'resilient sphere': 'otiluke\'s resilient sphere',
  'secret chest': 'leomund\'s secret chest',
  'telepathic bond': 'rary\'s telepathic bond',
  'tiny hut': 'leomund\'s tiny hut',
}

const monsterExact: Record<string, string> = {
  aboleth: 'Аболет',
  'air elemental': 'Воздушный элементаль',
  allosaurus: 'Аллозавр',
  animated: 'оживлённый',
  ankylosaurus: 'Анкилозавр',
  ape: 'Обезьяна',
  archmage: 'Архимаг',
  assassin: 'Убийца',
  azer: 'Азер',
  bandit: 'Бандит',
  'bandit captain': 'Капитан бандитов',
  basilisk: 'Василиск',
  bat: 'Летучая мышь',
  bearded: 'бородатый',
  behir: 'Бехир',
  berserker: 'Берсерк',
  black: 'чёрный',
  blink: 'мерцающий',
  'blood hawk': 'Кровавый ястреб',
  boar: 'Вепрь',
  'bone naga': 'Костяная нага',
  brown: 'бурый',
  bugbear: 'Багбир',
  bulette: 'Буллет',
  camel: 'Верблюд',
  cat: 'Кот',
  centaur: 'Кентавр',
  chimera: 'Химера',
  chuul: 'Чуул',
  clay: 'глиняный',
  cloaker: 'Плащевик',
  cloud: 'облачный',
  cockatrice: 'Кокатрис',
  commoner: 'Простолюдин',
  constrictor: 'удав',
  couatl: 'Куатль',
  crab: 'Краб',
  crocodile: 'Крокодил',
  cultist: 'Культист',
  'darkmantle': 'Темномантия',
  deer: 'Олень',
  'deva': 'Дэва',
  'dire wolf': 'Лютый волк',
  'diseased giant rat': 'Больная гигантская крыса',
  djinni: 'Джинн',
  doppelganger: 'Двойник',
  dragon: 'дракон',
  'dragon turtle': 'Драконья черепаха',
  dretch: 'Дретч',
  drider: 'Дридер',
  drow: 'Дроу',
  druid: 'Друид',
  dryad: 'Дриада',
  duergar: 'Двергар',
  dust: 'пылевой',
  eagle: 'Орёл',
  'earth elemental': 'Земляной элементаль',
  efreeti: 'Ифрит',
  elephant: 'Слон',
  elk: 'Лось',
  erinyes: 'Эриния',
  ettercap: 'Эттеркап',
  ettin: 'Эттин',
  'fire elemental': 'Огненный элементаль',
  'fire giant': 'Огненный великан',
  'flesh golem': 'Мясной голем',
  'flying snake': 'Летающая змея',
  'flying sword': 'Летающий меч',
  frog: 'Лягушка',
  'frost giant': 'Ледяной великан',
  gargoyle: 'Горгулья',
  genie: 'джинн',
  ghost: 'Призрак',
  ghoul: 'Упырь',
  giant: 'гигантский',
  'giant ape': 'Гигантская обезьяна',
  'giant badger': 'Гигантский барсук',
  'giant bat': 'Гигантская летучая мышь',
  'giant boar': 'Гигантский вепрь',
  'giant centipede': 'Гигантская многоножка',
  'giant constrictor snake': 'Гигантский удав',
  'giant crab': 'Гигантский краб',
  'giant crocodile': 'Гигантский крокодил',
  'giant eagle': 'Гигантский орёл',
  'giant elk': 'Гигантский лось',
  'giant fire beetle': 'Гигантский огненный жук',
  'giant frog': 'Гигантская лягушка',
  'giant goat': 'Гигантская коза',
  'giant hyena': 'Гигантская гиена',
  'giant lizard': 'Гигантская ящерица',
  'giant octopus': 'Гигантский осьминог',
  'giant owl': 'Гигантская сова',
  'giant poisonous snake': 'Гигантская ядовитая змея',
  'giant rat': 'Гигантская крыса',
  'giant scorpion': 'Гигантский скорпион',
  'giant sea horse': 'Гигантский морской конёк',
  'giant shark': 'Гигантская акула',
  'giant spider': 'Гигантский паук',
  'giant toad': 'Гигантская жаба',
  'giant vulture': 'Гигантский гриф',
  'giant wasp': 'Гигантская оса',
  'giant weasel': 'Гигантский хорёк',
  'giant wolf spider': 'Гигантский паук-волк',
  gibbering: 'бормочущий',
  glabrezu: 'Глабрезу',
  gladiator: 'Гладиатор',
  gnoll: 'Гнолл',
  goat: 'Коза',
  goblin: 'Гоблин',
  'goblin boss': 'Гоблин-вожак',
  'goblin warrior': 'Гоблин-воин',
  'goblin minion': 'Гоблин-миньон',
  'gold dragon': 'золотой дракон',
  gorgon: 'Горгон',
  gray: 'серый',
  green: 'зелёный',
  grick: 'Грик',
  griffon: 'Грифон',
  grimlock: 'Мраклок',
  guard: 'Стражник',
  'guardian naga': 'Нага-страж',
  'half-ogre': 'Полуогр',
  'half-red dragon veteran': 'Ветеран полудракон',
  harpy: 'Гарпия',
  hawk: 'Ястреб',
  hell: 'адский',
  'hell hound': 'Адская гончая',
  hezrou: 'Хезроу',
  'hill giant': 'Холмовой великан',
  hippogriff: 'Гиппогриф',
  hobgoblin: 'Хобгоблин',
  'hobgoblin captain': 'Хобгоблин-капитан',
  'hobgoblin warrior': 'Хобгоблин-воин',
  homunculus: 'Гомункул',
  'hook horror': 'Крюкастый ужас',
  horse: 'лошадь',
  'hunter shark': 'Акула-охотник',
  hydra: 'Гидра',
  hyena: 'Гиена',
  ice: 'ледяной',
  imp: 'Имп',
  'incubus': 'Инкуб',
  'iron golem': 'Железный голем',
  jackal: 'Шакал',
  'killer whale': 'Касатка',
  knight: 'Рыцарь',
  kobold: 'Кобольд',
  kraken: 'Кракен',
  lamia: 'Ламия',
  lemure: 'Лемур',
  lich: 'Лич',
  lion: 'Лев',
  lizard: 'Ящерица',
  lizardfolk: 'Ящеролюд',
  mage: 'Маг',
  magma: 'магмовый',
  magmin: 'Магмин',
  mammoth: 'Мамонт',
  manticore: 'Мантикора',
  marilith: 'Марилита',
  mastiff: 'Мастиф',
  medusa: 'Медуза',
  merfolk: 'Мерфолк',
  merrow: 'Мерроу',
  mezzoloth: 'Меззолот',
  mimic: 'Мимик',
  minotaur: 'Минотавр',
  'minotaur skeleton': 'Скелет минотавра',
  mule: 'Мул',
  mummy: 'Мумия',
  'mummy lord': 'Повелитель мумий',
  naga: 'нага',
  nalfeshnee: 'Нальфешнии',
  night: 'ночной',
  nightmare: 'Кошмар',
  noble: 'Дворянин',
  nothic: 'Нотик',
  nycaloth: 'Никалот',
  ochre: 'охряный',
  octopus: 'Осьминог',
  ogre: 'Огр',
  'ogre zombie': 'Огр-зомби',
  oni: 'Они',
  orc: 'Орк',
  otyugh: 'Отиуг',
  owl: 'Сова',
  owlbear: 'Совомед',
  panther: 'Пантера',
  pegasus: 'Пегас',
  'phase spider': 'Фазовый паук',
  pit: 'бездонный',
  'pit fiend': 'Владыка бездны',
  planetar: 'Планетар',
  plesiosaurus: 'Плезиозавр',
  'poisonous snake': 'Ядовитая змея',
  polar: 'полярный',
  pony: 'Пони',
  priest: 'Жрец',
  pseudodragon: 'Псевдодракон',
  pteranodon: 'Птеранодон',
  purple: 'пурпурный',
  quasit: 'Квазит',
  'quipper': 'Пиранья',
  rakshasa: 'Ракшаса',
  rat: 'Крыса',
  raven: 'Ворон',
  'red dragon': 'красный дракон',
  'reef shark': 'Рифовая акула',
  remorhaz: 'Ремораз',
  'rhinoceros': 'Носорог',
  roc: 'Рух',
  roper: 'Хвататель',
  'rug of smothering': 'Ковёр-душитель',
  rust: 'ржавый',
  'rust monster': 'Ржавый монстр',
  saber: 'саблезубый',
  'saber-toothed tiger': 'Саблезубый тигр',
  sahuagin: 'Сахуагин',
  salamander: 'Саламандра',
  satyr: 'Сатир',
  scorpion: 'Скорпион',
  scout: 'Разведчик',
  sea: 'морской',
  'sea hag': 'Морская ведьма',
  'sea horse': 'Морской конёк',
  shadow: 'Тень',
  'shambling mound': 'Ходячий холм',
  'shield guardian': 'Щитовой страж',
  shrieker: 'Визгун',
  silver: 'серебряный',
  skeleton: 'Скелет',
  'solar': 'Солар',
  spectator: 'Наблюдатель-страж',
  specter: 'Фантом',
  spider: 'Паук',
  sprite: 'Фея',
  spy: 'Шпион',
  'steam mephit': 'Паровой мефит',
  'stirge': 'Стирдж',
  'stone giant': 'Каменный великан',
  'stone golem': 'Каменный голем',
  'storm giant': 'Штормовой великан',
  succubus: 'Суккуб',
  'swarm of bats': 'Рой летучих мышей',
  'swarm of insects': 'Рой насекомых',
  'swarm of poisonous snakes': 'Рой ядовитых змей',
  'swarm of quippers': 'Рой пираний',
  'swarm of rats': 'Рой крыс',
  'swarm of ravens': 'Рой воронов',
  tarrasque: 'Тарраск',
  'thug': 'Головорез',
  tiger: 'Тигр',
  treant: 'Энт',
  'tribal warrior': 'Племенной воин',
  triceratops: 'Трицератопс',
  troll: 'Тролль',
  'tyrannosaurus rex': 'Тираннозавр',
  unicorn: 'Единорог',
  vampire: 'Вампир',
  'vampire spawn': 'Порождение вампира',
  veteran: 'Ветеран',
  'violet fungus': 'Фиолетовый гриб',
  vrock: 'Врок',
  vulture: 'Гриф',
  'warhorse': 'Боевой конь',
  'warhorse skeleton': 'Скелет боевого коня',
  'water elemental': 'Водяной элементаль',
  weasel: 'Хорёк',
  werebear: 'Вермедведь',
  wereboar: 'Вервепрь',
  wererat: 'Веркрыса',
  weretiger: 'Вертигр',
  werewolf: 'Верволк',
  'white dragon': 'белый дракон',
  wight: 'Умертвие',
  'will-o\'-wisp': 'Блуждающий огонёк',
  'winter wolf': 'Зимний волк',
  wolf: 'Волк',
  worg: 'Ворг',
  wraith: 'Призрак-рейт',
  wyvern: 'Виверна',
  xorn: 'Зорн',
  yeti: 'Йети',
  'young': 'молодой',
  zombie: 'Зомби',
  sentinel: 'часовой',
  stalker: 'сталкер',
  mouther: 'рот',
  familiar: 'фамильяр',
  fungus: 'гриб',
  infantry: 'пехотинец',
  fly: 'муха',
  seahorse: 'морской конёк',
  venomous: 'ядовитый',
  acolyte: 'послушник',
  trooper: 'боец',
  fanatic: 'фанатик',
  skirmisher: 'застрельщик',
  dog: 'пёс',
  baphomet: 'Бафомета',
  armor: 'доспех',
  rug: 'ковёр',
  smothering: 'душитель',
  jelly: 'желе',
  worm: 'червь',
  crawling: 'ползающий',
  claws: 'когти',
  piranhas: 'пираний',
  snakes: 'змей',
  limb: 'конечность',
  ankheg: 'Анхег',
  archelon: 'Архелон',
  awakened: 'пробуждённый',
  shrub: 'куст',
  tree: 'дерево',
  'axe beak': 'Топороклюв',
  baboon: 'Бабуин',
  balor: 'Балор',
  barbed: 'колючий',
  chain: 'цепной',
  death: 'мертвящий',
  draft: 'упряжной',
  gelatinous: 'студенистый',
  cube: 'куб',
  ghast: 'Вурдалак',
  'half-dragon': 'Полудракон',
  hippopotamus: 'Бегемот',
  horned: 'рогатый',
  invisible: 'невидимый',
  piranha: 'Пиранья',
  pirate: 'Пират',
  riding: 'верховой',
  sphinx: 'сфинкс',
  lore: 'знаний',
  valor: 'доблести',
  wonder: 'чуда',
  spirit: 'дух',
  tough: 'Головорез',
}

const monsterWord: Record<string, string> = {
  adult: 'взрослый',
  ancient: 'древний',
  young: 'молодой',
  wyrmling: 'детёныш',
  black: 'чёрный',
  blue: 'синий',
  brass: 'латунный',
  bronze: 'бронзовый',
  copper: 'медный',
  gold: 'золотой',
  green: 'зелёный',
  red: 'красный',
  silver: 'серебряный',
  white: 'белый',
  cloud: 'облачный',
  fire: 'огненный',
  frost: 'ледяной',
  hill: 'холмовой',
  stone: 'каменный',
  storm: 'штормовой',
  air: 'воздушный',
  earth: 'земляной',
  water: 'водяной',
  ice: 'ледяной',
  magma: 'магмовый',
  smoke: 'дымный',
  steam: 'паровой',
  dust: 'пылевой',
  mud: 'грязный',
  giant: 'гигантский',
  dire: 'лютый',
  flying: 'летающий',
  poisonous: 'ядовитый',
  polar: 'полярный',
  saber: 'саблезубый',
  'saber-toothed': 'саблезубый',
  winter: 'зимний',
  bone: 'костяной',
  clay: 'глиняный',
  flesh: 'мясной',
  iron: 'железный',
  shield: 'щитовой',
  guardian: 'страж',
  swarm: 'рой',
  of: '',
  the: '',
  and: 'и',
  dragon: 'дракон',
  elemental: 'элементаль',
  golem: 'голем',
  hag: 'ведьма',
  hound: 'гончая',
  mephit: 'мефит',
  naga: 'нага',
  ooze: 'слизь',
  pudding: 'пудинг',
  snake: 'змея',
  spider: 'паук',
  sword: 'меч',
  wolf: 'волк',
  warrior: 'воин',
  minion: 'миньон',
  boss: 'вожак',
  captain: 'капитан',
  knight: 'рыцарь',
  priest: 'жрец',
  mage: 'маг',
  veteran: 'ветеран',
  spawn: 'порождение',
  lord: 'повелитель',
  fiend: 'исчадие',
  devil: 'дьявол',
  demon: 'демон',
  angel: 'ангел',
  skeleton: 'скелет',
  zombie: 'зомби',
  ghost: 'призрак',
  specter: 'фантом',
  wraith: 'рейт',
  vampire: 'вампир',
  mummy: 'мумия',
  ghoul: 'упырь',
  wight: 'умертвие',
  goblin: 'гоблин',
  hobgoblin: 'хобгоблин',
  orc: 'орк',
  kobold: 'кобольд',
  gnoll: 'гнолл',
  ogre: 'огр',
  troll: 'тролль',
  owlbear: 'совомед',
  bear: 'медведь',
  ape: 'обезьяна',
  rat: 'крыса',
  bat: 'летучая мышь',
  boar: 'вепрь',
  eagle: 'орёл',
  elk: 'лось',
  frog: 'лягушка',
  goat: 'коза',
  hyena: 'гиена',
  lizard: 'ящерица',
  octopus: 'осьминог',
  owl: 'сова',
  scorpion: 'скорпион',
  shark: 'акула',
  toad: 'жаба',
  vulture: 'гриф',
  wasp: 'оса',
  weasel: 'хорёк',
  crab: 'краб',
  crocodile: 'крокодил',
  centipede: 'многоножка',
  constrictor: 'удав',
  beetle: 'жук',
  badger: 'барсук',
  horse: 'конь',
  warhorse: 'боевой конь',
  cultist: 'культист',
  bandit: 'бандит',
  guard: 'стражник',
  scout: 'разведчик',
  spy: 'шпион',
  thug: 'головорез',
  commoner: 'простолюдин',
  noble: 'дворянин',
  assassin: 'убийца',
  gladiator: 'гладиатор',
  druid: 'друид',
  archmage: 'архимаг',
}

interface SpellRow {
  id: string
  name: string
  level: number
  dice: string
  text: string
  school: string
  classes: string[]
}

interface ItemRow {
  id: string
  name: string
  text: string
  gear: Record<string, unknown>
}

interface MonsterRow {
  id: string
  name: string
  ac: number
  hp: number
  speed: number
  cr: number | null
  attacks: Array<{
    id: string
    name: string
    attackBonus: number
    damageDice: string
    damageBonus: number
    damageType: string
  }>
  abilities: Record<string, number>
  saves: Record<string, number>
}

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

function slugOf(key: string) {
  return key.replace(/^srd-2024_/, '')
}

function titleRu(value: string) {
  if (!value)
    return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function cleanText(value: string) {
  return value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 1400)
}

function named(value: unknown) {
  if (!value || typeof value !== 'object' || !('name' in value))
    return ''
  return String((value as { name?: string }).name ?? '')
}

function translateMonster(english: string) {
  const key = english.trim().toLowerCase()
  if (monsterExact[key])
    return monsterExact[key]
  const parts = key.split(/[\s/]+/).filter(part => part && part !== 'of' && part !== 'the')
  const words = parts.map(part => monsterWord[part] ?? monsterExact[part] ?? part).filter(Boolean)
  if (words.some(word => /[a-z]/.test(word)))
    return titleRu(words.join(' '))
  return titleRu(words.join(' '))
}

function abilityOfWeapon(row: { range?: number, properties?: Array<{ property?: { name?: string } }> }) {
  const names = (row.properties ?? []).map(item => String(item.property?.name ?? '').toLowerCase())
  if (names.includes('finesse'))
    return 'finesse'
  if ((row.range ?? 0) > 0)
    return 'dex'
  return 'str'
}

function propertyLine(row: { properties?: Array<{ property?: { name?: string }, detail?: string | null }> }) {
  return (row.properties ?? []).map((item) => {
    const name = String(item.property?.name ?? '')
    const ru = propertyRu[name.toLowerCase()] ?? name
    return item.detail ? `${ru} (${item.detail})` : ru
  }).filter(Boolean).join(', ')
}

function dieFrom(count: number | null | undefined, type: string | null | undefined) {
  if (!count || !type)
    return '0'
  const sides = type.replace(/^d/i, '')
  return `${count}d${sides}`
}

function damageTypeOf(atk: Record<string, unknown>, desc: string) {
  const extra = atk.extra_damage_type
  const main = atk.damage_type
  const fromAtk = named(extra) || named(main)
  if (fromAtk)
    return damageRu[fromAtk.toLowerCase()] ?? fromAtk.toLowerCase()
  const match = desc.match(/(\w+)\s+damage/i)
  if (!match)
    return 'дробящий'
  return damageRu[match[1].toLowerCase()] ?? match[1].toLowerCase()
}

function attackFromAction(action: Record<string, unknown>) {
  const name = String(action.name ?? 'Атака')
  if (/^multiattack$/i.test(name))
    return []
  if (String(action.action_type ?? '') === 'LEGENDARY_ACTION')
    return []
  const desc = String(action.desc ?? '')
  const nested = Array.isArray(action.attacks) ? action.attacks as Record<string, unknown>[] : []
  if (nested.length > 0) {
    return nested.map((atk, index) => {
      const hit = typeof atk.to_hit_mod === 'number' ? atk.to_hit_mod : 0
      const bonus = typeof atk.damage_bonus === 'number' ? atk.damage_bonus : 0
      return {
        id: slug(`${name}-${index}`),
        name: translateAction(name),
        attackBonus: hit,
        damageDice: dieFrom(Number(atk.damage_die_count), String(atk.damage_die_type ?? '')),
        damageBonus: bonus,
        damageType: damageTypeOf(atk, desc),
      }
    })
  }
  const parsed = attackFromDesc(name, desc)
  return parsed ? [parsed] : []
}

const abilityRu: Record<string, string> = {
  strength: 'Силы',
  dexterity: 'Ловкости',
  constitution: 'Телосложения',
  intelligence: 'Интеллекта',
  wisdom: 'Мудрости',
  charisma: 'Харизмы',
}

function attackFromDesc(name: string, desc: string) {
  const hit = desc.match(/Attack Roll:\s*([+-]?\d+)/i)
  const dice = desc.match(/(\d+d\d+)(?:\s*\+\s*(\d+))?/i)
  const save = desc.match(/(\w+)\s+Saving Throw:\s*DC\s*(\d+)/i)
  if (!hit && !save)
    return null
  const dtypeMatch = desc.match(/\b(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\b/i)
  const dtype = dtypeMatch ? (damageRu[dtypeMatch[1].toLowerCase()] ?? dtypeMatch[1].toLowerCase()) : 'дробящий'
  if (save && !hit) {
    const ability = abilityRu[save[1].toLowerCase()] ?? save[1]
    return {
      id: slug(name),
      name: translateAction(name),
      attackBonus: 0,
      damageDice: dice?.[1] ?? '0',
      damageBonus: dice?.[2] ? Number(dice[2]) : 0,
      damageType: `спасбросок ${ability} Сл ${save[2]}`,
    }
  }
  return {
    id: slug(name),
    name: translateAction(name),
    attackBonus: hit ? Number(hit[1]) : 0,
    damageDice: dice?.[1] ?? '0',
    damageBonus: dice?.[2] ? Number(dice[2]) : 0,
    damageType: dtype,
  }
}

const actionExact: Record<string, string> = {
  bite: 'Укус',
  claws: 'Когти',
  claw: 'Когти',
  slam: 'Удар',
  tail: 'Хвост',
  gore: 'Бодание',
  peck: 'Клюв',
  beak: 'Клюв',
  tentacle: 'Щупальце',
  tentacles: 'Щупальца',
  spear: 'Копьё',
  scimitar: 'Скимитар',
  shortsword: 'Короткий меч',
  longsword: 'Длинный меч',
  shortbow: 'Короткий лук',
  longbow: 'Длинный лук',
  greatclub: 'Палица',
  greataxe: 'Секира',
  rock: 'Камень',
  fists: 'Кулаки',
  hooves: 'Копыта',
  horns: 'Рога',
  'consume memories': 'Поглощение воспоминаний',
  'dominate mind': 'Подчинение разума',
}

function translateAction(name: string) {
  const key = name.trim().toLowerCase().replace(/ attack$/, '')
  if (actionExact[key])
    return actionExact[key]
  return translateMonster(name)
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'attack'
}

async function loadEtignis() {
  const src = await fetch(etignisUrl).then(r => r.text())
  const file = path.join(tmpdir(), `etignis-spells-${Date.now()}.mjs`)
  await writeFile(file, `${src}\nexport default allSpells\n`)
  const module = await import(pathToFileURL(file).href) as { default: Array<{ en?: { name?: string }, ru?: { name?: string, text?: string, school?: string } }> }
  await rm(file, { force: true })
  const rows = module.default
  const map = new Map<string, { name: string, text: string, school: string }>()
  for (const row of rows) {
    const en = String(row.en?.name ?? '').trim().toLowerCase()
    if (!en || !row.ru?.name)
      continue
    map.set(en, {
      name: String(row.ru.name),
      text: String(row.ru.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 1400),
      school: String(row.ru.school ?? ''),
    })
  }
  return map
}

async function importSpells(ru: Map<string, { name: string, text: string, school: string }>) {
  const rows = await paginate<Record<string, unknown>>(`${open5e}/spells/?document__key__in=srd-2024&limit=100`)
  const spells: SpellRow[] = []
  const missing: string[] = []
  for (const row of rows) {
    const english = String(row.name ?? '')
    const id = slugOf(String(row.key ?? english))
    const key = english.toLowerCase()
    const hit = ru.get(key) ?? (spellAlias[key] ? ru.get(spellAlias[key]) : undefined)
    const extra = spellRuExtra[key]
    const name = hit?.name ?? extra ?? english
    if (!hit && !extra)
      missing.push(english)
    const schoolKey = named(row.school).toLowerCase()
    const classes = Array.isArray(row.classes)
      ? (row.classes as Array<{ key?: string }>).map(item => String(item.key ?? '').replace(/^srd-2024_/, '')).filter(Boolean)
      : []
    const text = cleanText(hit?.text || String(row.desc ?? ''))
    spells.push({
      id,
      name,
      level: Number(row.level ?? 0),
      dice: typeof row.damage_roll === 'string' ? row.damage_roll : '',
      text,
      school: hit?.school || schoolRu[schoolKey] || schoolKey,
      classes,
    })
  }
  spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'))
  return { spells, missing }
}

async function importItems() {
  const weapons = await paginate<Record<string, unknown>>(`${open5e}/weapons/?document__key__in=srd-2024&limit=100`)
  const armors = await paginate<Record<string, unknown>>(`${open5e}/armor/?document__key__in=srd-2024&limit=100`)
  const items: ItemRow[] = []
  for (const row of weapons) {
    if (row.is_improvised)
      continue
    const english = String(row.name ?? '')
    const id = slugOf(String(row.key ?? english))
    const dtype = named(row.damage_type)
    items.push({
      id,
      name: weaponRu[english.toLowerCase()] ?? english,
      text: propertyLine(row as { properties?: Array<{ property?: { name?: string }, detail?: string | null }> }),
      gear: {
        kind: 'weapon',
        dice: String(row.damage_dice ?? '1d4'),
        damageType: damageRu[dtype.toLowerCase()] ?? 'дробящий',
        ability: abilityOfWeapon(row as { range?: number, properties?: Array<{ property?: { name?: string } }> }),
      },
    })
  }
  for (const row of armors) {
    const english = String(row.name ?? '')
    const id = slugOf(String(row.key ?? english)).replace(/-armor$/, '')
    if (english.toLowerCase() === 'shield' || String(row.category ?? '') === 'shield') {
      items.push({
        id,
        name: armorRu.shield,
        text: '+2 КД.',
        gear: { kind: 'shield' },
      })
      continue
    }
    const addDex = Boolean(row.ac_add_dexmod)
    const cap = typeof row.ac_cap_dexmod === 'number' ? row.ac_cap_dexmod : null
    items.push({
      id,
      name: armorRu[english.toLowerCase().replace(/ armor$/, '')] ?? armorRu[english.toLowerCase()] ?? english,
      text: String(row.ac_display ?? ''),
      gear: {
        kind: 'armor',
        base: Number(row.ac_base ?? 10),
        dexCap: addDex ? cap : 0,
      },
    })
  }
  items.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return items
}

async function importMonsters() {
  const rows = await paginate<Record<string, unknown>>(`${open5e}/creatures/?document__key__in=srd-2024&limit=50`)
  const monsters: MonsterRow[] = []
  for (const row of rows) {
    const english = String(row.name ?? '')
    const id = slugOf(String(row.key ?? english))
    const scores = (row.ability_scores ?? {}) as Record<string, number>
    const mods = (row.modifiers ?? {}) as Record<string, number>
    const throws = (row.saving_throws ?? {}) as Record<string, number>
    const saves: Record<string, number> = {}
    const map = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' } as const
    for (const [full, short] of Object.entries(map)) {
      const value = throws[full]
      if (typeof value === 'number' && value !== mods[full])
        saves[short] = value
    }
    const speed = row.speed && typeof row.speed === 'object' && 'walk' in row.speed
      ? Number((row.speed as { walk?: number }).walk ?? 30)
      : 30
    const actions = Array.isArray(row.actions) ? row.actions as Record<string, unknown>[] : []
    monsters.push({
      id,
      name: translateMonster(english),
      ac: Number(row.armor_class ?? 10),
      hp: Number(row.hit_points ?? 1),
      speed: Number.isFinite(speed) ? speed : 30,
      cr: typeof row.challenge_rating === 'number' ? row.challenge_rating : null,
      attacks: actions.flatMap(attackFromAction),
      abilities: {
        str: Number(scores.strength ?? 10),
        dex: Number(scores.dexterity ?? 10),
        con: Number(scores.constitution ?? 10),
        int: Number(scores.intelligence ?? 10),
        wis: Number(scores.wisdom ?? 10),
        cha: Number(scores.charisma ?? 10),
      },
      saves,
    })
  }
  monsters.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return monsters
}

const ru = await loadEtignis()
const { spells, missing } = await importSpells(ru)
const items = await importItems()
const monsters = await importMonsters()
const heroes = await importHeroes(paginate, open5e)
await mkdir(outDir, { recursive: true })
await writeFile(path.join(outDir, 'srd-2024-spells.json'), `${JSON.stringify(spells, null, 2)}\n`)
await writeFile(path.join(outDir, 'srd-2024-items.json'), `${JSON.stringify(items, null, 2)}\n`)
await writeFile(path.join(outDir, 'srd-2024-monsters.json'), `${JSON.stringify(monsters, null, 2)}\n`)
await writeFile(path.join(outDir, 'srd-2024-classes.json'), `${JSON.stringify(heroes.classes, null, 2)}\n`)
await writeFile(path.join(outDir, 'srd-2024-subclasses.json'), `${JSON.stringify(heroes.subclasses, null, 2)}\n`)
await writeFile(path.join(outDir, 'srd-2024-feats.json'), `${JSON.stringify(heroes.feats, null, 2)}\n`)
await writeFile(path.join(outDir, 'srd-2024-backgrounds.json'), `${JSON.stringify(heroes.backgrounds, null, 2)}\n`)
// Классы и подклассы из Open5e англоязычные и покрывают только SRD, поэтому поверх них идёт импорт с dnd.su.
const dndsu = await importDndSuClasses()
const latinSpells = missing.filter(name => !spellRuExtra[name.toLowerCase()])
const latinMonsters = monsters.filter(row => /[a-z]/i.test(row.name)).map(row => `${row.id} | ${row.name}`)
const latinItems = items.filter(row => /[a-z]/i.test(row.name)).map(row => `${row.id} | ${row.name}`)
console.log(JSON.stringify({
  spells: spells.length,
  items: items.length,
  monsters: monsters.length,
  classes: dndsu.classes,
  subclasses: dndsu.subclasses,
  classFeatures: dndsu.features,
  subclassFeatures: dndsu.subclassFeatures,
  dndsuEmptyFields: dndsu.emptyFields,
  backgrounds: heroes.backgrounds.length,
  feats: heroes.feats.length,
  missingSpells: latinSpells.slice(0, 40),
  missingSpellCount: latinSpells.length,
  latinMonsters: latinMonsters.slice(0, 40),
  latinMonsterCount: latinMonsters.length,
  latinItems,
  latinHeroes: heroes.latin.slice(0, 80),
  latinHeroCount: heroes.latin.length,
}, null, 2))
