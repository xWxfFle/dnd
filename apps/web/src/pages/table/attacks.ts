import type { AttackDef } from '@dnd/shared'

export function readAttacks(body: Record<string, unknown>) {
  if (!Array.isArray(body.attacks))
    return []
  return body.attacks.filter(isAttack)
}

function isAttack(value: unknown): value is AttackDef {
  if (typeof value !== 'object' || !value)
    return false
  if (!('id' in value) || typeof value.id !== 'string')
    return false
  if (!('name' in value) || typeof value.name !== 'string')
    return false
  if (!('attackBonus' in value) || typeof value.attackBonus !== 'number')
    return false
  if (!('damageDice' in value) || typeof value.damageDice !== 'string')
    return false
  if (!('damageBonus' in value) || typeof value.damageBonus !== 'number')
    return false
  if (!('damageType' in value) || typeof value.damageType !== 'string')
    return false
  return true
}
