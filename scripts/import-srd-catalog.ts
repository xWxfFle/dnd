import { importDndSuBackgrounds } from './import-dndsu-backgrounds'
import { importDndSuClasses } from './import-dndsu-classes'
import { importDndSuFeats } from './import-dndsu-feats'
import { importDndSuItems } from './import-dndsu-items'
import { importDndSuMonsters } from './import-dndsu-monsters'
import { importDndSuSpells } from './import-dndsu-spells'

// Порядок: классы раньше заклинаний — спеллы сверяют стартовые списки с srd-2024-classes.json.
const classes = await importDndSuClasses()
const items = await importDndSuItems()
const spells = await importDndSuSpells()
const monsters = await importDndSuMonsters()
const backgrounds = await importDndSuBackgrounds()
const feats = await importDndSuFeats()

console.log(JSON.stringify({
  classes: classes.classes,
  subclasses: classes.subclasses,
  classFeatures: classes.features,
  subclassFeatures: classes.subclassFeatures,
  dndsuEmptyFields: classes.emptyFields,
  items: items.equipment,
  magicItems: items.magicItems,
  dndsuEmptyGear: items.emptyGear,
  spells: spells.spells,
  spellsWithoutClasses: spells.withoutClasses,
  missingStarterSpells: spells.missingStarterSpells,
  monsters: monsters.monsters,
  monstersWithoutAttacks: monsters.withoutAttacks,
  untypedDamage: monsters.untypedDamage,
  backgrounds: backgrounds.backgrounds,
  emptyFeat: backgrounds.emptyFeat,
  emptySkills: backgrounds.emptySkills,
  emptyAbilities: backgrounds.emptyAbilities,
  feats: feats.feats,
  featByCategory: feats.byCategory,
  emptyFeatText: feats.emptyText,
}, null, 2))
