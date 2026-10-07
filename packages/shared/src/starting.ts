import type { Abilities, ClassResource, InventoryItem, Skill } from './types'
import { abilities, skills } from './types'

function pb(level: number) {
  return Math.ceil(Math.max(1, level) / 4) + 1
}

export type StartingPack = 'a' | 'b'

interface GearGrant {
  id: string
  quantity?: number
}

const emptyAsi = {
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
} as const satisfies Abilities

const packByBackground: Record<string, GearGrant[]> = {
  entertainer: [{ id: 'lute' }, { id: 'costume', quantity: 2 }, { id: 'mirror' }, { id: 'perfume' }, { id: 'travelers-clothes' }],
  wayfarer: [{ id: 'dagger', quantity: 2 }, { id: 'thieves-tools' }, { id: 'gaming-set' }, { id: 'bedroll' }, { id: 'pouch', quantity: 2 }, { id: 'travelers-clothes' }],
  noble: [{ id: 'gaming-set' }, { id: 'fine-clothes' }, { id: 'perfume' }],
  sailor: [{ id: 'dagger' }, { id: 'navigators-tools' }, { id: 'rope' }, { id: 'travelers-clothes' }],
  sage: [{ id: 'quarterstaff' }, { id: 'calligraphers-supplies' }, { id: 'book' }, { id: 'parchment', quantity: 8 }, { id: 'robe' }],
  hermit: [{ id: 'quarterstaff' }, { id: 'herbalism-kit' }, { id: 'bedroll' }, { id: 'book' }, { id: 'lamp' }, { id: 'oil', quantity: 3 }, { id: 'travelers-clothes' }],
  scribe: [{ id: 'calligraphers-supplies' }, { id: 'fine-clothes' }, { id: 'lamp' }, { id: 'oil', quantity: 3 }, { id: 'parchment', quantity: 12 }],
  acolyte: [{ id: 'calligraphers-supplies' }, { id: 'book' }, { id: 'holy-symbol' }, { id: 'parchment', quantity: 10 }, { id: 'robe' }],
  criminal: [{ id: 'dagger', quantity: 2 }, { id: 'thieves-tools' }, { id: 'crowbar' }, { id: 'pouch', quantity: 2 }, { id: 'travelers-clothes' }],
  guide: [{ id: 'shortbow' }, { id: 'arrows', quantity: 20 }, { id: 'cartographers-tools' }, { id: 'bedroll' }, { id: 'quiver' }, { id: 'tent' }, { id: 'travelers-clothes' }],
  artisan: [{ id: 'smiths-tools' }, { id: 'pouch', quantity: 2 }, { id: 'travelers-clothes' }],
  soldier: [{ id: 'spear' }, { id: 'shortbow' }, { id: 'arrows', quantity: 20 }, { id: 'gaming-set' }, { id: 'healers-kit' }, { id: 'quiver' }, { id: 'travelers-clothes' }],
  guard: [{ id: 'spear' }, { id: 'light-crossbow' }, { id: 'crossbow-bolts', quantity: 20 }, { id: 'gaming-set' }, { id: 'hooded-lantern' }, { id: 'manacles' }, { id: 'quiver' }, { id: 'travelers-clothes' }],
  merchant: [{ id: 'navigators-tools' }, { id: 'pouch', quantity: 2 }, { id: 'travelers-clothes' }],
  farmer: [{ id: 'sickle' }, { id: 'carpenters-tools' }, { id: 'healers-kit' }, { id: 'iron-pot' }, { id: 'shovel' }, { id: 'travelers-clothes' }],
  charlatan: [{ id: 'forgery-kit' }, { id: 'costume' }, { id: 'fine-clothes' }],
}

export const weaponMasteryChoices = [
  { id: 'item-battleaxe', name: 'Боевой топор' },
  { id: 'item-dagger', name: 'Кинжал' },
  { id: 'item-greatsword', name: 'Двуручный меч' },
  { id: 'item-longbow', name: 'Длинный лук' },
  { id: 'item-longsword', name: 'Длинный меч' },
  { id: 'item-mace', name: 'Булава' },
  { id: 'item-quarterstaff', name: 'Боевой посох' },
  { id: 'item-shortbow', name: 'Короткий лук' },
  { id: 'item-spear', name: 'Копьё' },
  { id: 'item-warhammer', name: 'Боевой молот' },
] as const

const masteryCountByClass = {
  'class-fighter': 3,
} as const satisfies Record<string, number>

export function backgroundKey(backgroundId: string) {
  return backgroundId.replace(/^background-/, '')
}

export function startingGrants(backgroundId: string, pack: StartingPack): GearGrant[] {
  if (pack !== 'a')
    return []
  return packByBackground[backgroundKey(backgroundId)] ?? []
}

export function acceptBackgroundAsi(listed: readonly string[], bonuses: Partial<Abilities>) {
  let total = 0
  let plusTwo = 0
  for (const key of abilities) {
    const bonus = bonuses[key] ?? 0
    if (!Number.isInteger(bonus) || bonus < 0 || bonus > 2)
      return false
    if (bonus > 0 && !listed.includes(key))
      return false
    total += bonus
    if (bonus === 2)
      plusTwo += 1
  }
  return total === 3 && plusTwo <= 1
}

export function applyBackgroundAsi(base: Abilities, listed: readonly string[], bonuses: Partial<Abilities>): Abilities | null {
  if (!acceptBackgroundAsi(listed, bonuses))
    return null
  const next = { ...base }
  for (const key of abilities) {
    next[key] = base[key] + (bonuses[key] ?? 0)
    if (next[key] > 20 || next[key] < 1)
      return null
  }
  return next
}

export function emptyBackgroundAsi(): Abilities {
  return { ...emptyAsi }
}

export function originSkillBonus(originFeatId: string | null | undefined) {
  return originFeatId === 'feat-skilled' ? 3 : 0
}

export function weaponMasteryCount(classId: string, mastery: boolean) {
  if (!mastery)
    return 0
  return masteryCountByClass[classId as keyof typeof masteryCountByClass] ?? 2
}

export function acceptWeaponMasteries(picked: readonly string[], classId: string, mastery: boolean) {
  const need = weaponMasteryCount(classId, mastery)
  if (need === 0)
    return picked.length === 0 ? [] : null
  const allowed = new Set<string>(weaponMasteryChoices.map(item => item.id))
  const unique = [...new Set(picked)]
  if (unique.length !== need || unique.some(id => !allowed.has(id)))
    return null
  return unique
}

export function acceptExpertisePicks(picked: readonly Skill[], proficient: readonly Skill[], need: number) {
  if (need === 0)
    return picked.length === 0 ? [] : null
  const unique = [...new Set(picked)]
  const allowed = new Set(proficient)
  if (unique.length !== need || unique.some(skill => !allowed.has(skill) || !(skills as readonly string[]).includes(skill)))
    return null
  return unique
}

export function createExpertiseNeed(classId: string) {
  return classId === 'class-rogue' ? 2 : 0
}

export function luckResource(level: number, previous?: ClassResource): ClassResource {
  const max = pb(level)
  return {
    id: 'luck-points',
    name: 'Очки везения',
    max,
    spent: Math.min(previous?.spent ?? 0, max),
    recover: 'long',
  }
}

export function withLuckResource(pools: ClassResource[], featIds: readonly string[], level: number) {
  if (!featIds.includes('feat-lucky'))
    return pools.filter(pool => pool.id !== 'luck-points')
  const previous = pools.find(pool => pool.id === 'luck-points')
  return [...pools.filter(pool => pool.id !== 'luck-points'), luckResource(level, previous)]
}

export function toughHitBonus(featIds: readonly string[], level: number) {
  return featIds.includes('feat-tough') ? 2 * Math.max(1, level) : 0
}

export function seedInventory(
  grants: GearGrant[],
  gearOf: (itemId: string) => { name: string, stats: { kind: InventoryItem['kind'] } } | null,
): InventoryItem[] {
  let equippedWeapon = false
  let equippedArmor = false
  return grants.flatMap((grant) => {
    const itemId = grant.id.startsWith('item-') ? grant.id : `item-${grant.id}`
    const gear = gearOf(itemId)
    if (!gear)
      return []
    const kind = gear.stats.kind
    const wearWeapon = kind === 'weapon' && !equippedWeapon
    const wearArmor = kind === 'armor' && !equippedArmor
    if (wearWeapon)
      equippedWeapon = true
    if (wearArmor)
      equippedArmor = true
    return [{
      id: crypto.randomUUID(),
      itemId,
      name: gear.name,
      quantity: grant.quantity ?? 1,
      kind,
      equipped: wearWeapon || wearArmor,
    }]
  })
}

export function jackOfAllTrades(featureIds: readonly string[]) {
  return featureIds.includes('jack-of-all-trades')
}

export function skillCheckBonus(input: {
  modifier: number
  level: number
  proficient: boolean
  expertise: boolean
  jack: boolean
}) {
  const bonus = pb(input.level)
  if (input.proficient)
    return input.modifier + bonus * (input.expertise ? 2 : 1)
  if (input.jack)
    return input.modifier + Math.floor(bonus / 2)
  return input.modifier
}
