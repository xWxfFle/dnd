import type { DiceRollDto } from '@dnd/shared'
import { notifications } from '@mantine/notifications'
import { reaction, scoped, store } from '@virentia/core'
import { createElement } from 'react'
import { tableRoute } from '@/shared/routing'
import { appScope } from '@/shared/session'
import { liveSnapshot } from './live'
import { RollToast } from './roll-toast-card'

const primedCampaignId = store<string | null>(null)
const seenRollIds = store<string[]>([])

export function bootRollToasts() {
  scoped(appScope, () => {
    reaction({
      on: liveSnapshot,
      run(snapshot) {
        if (!snapshot)
          return
        const ids = snapshot.rolls.map(item => item.id)
        // Первый снимок кампании только запоминает броски, иначе всплывёт вся лента.
        if (primedCampaignId.value !== snapshot.campaign.id) {
          primedCampaignId.value = snapshot.campaign.id
          seenRollIds.value = ids
          return
        }
        const known = new Set(seenRollIds.value)
        seenRollIds.value = ids
        for (const roll of snapshot.rolls) {
          if (!known.has(roll.id))
            showRollToast(roll)
        }
      },
    })
    reaction({
      on: tableRoute.closed,
      run() {
        primedCampaignId.value = null
        seenRollIds.value = []
      },
    })
  })
}

function showRollToast(roll: DiceRollDto) {
  const natural = keptNatural(roll)
  notifications.show({
    id: roll.id,
    message: `${roll.displayName}: ${roll.label} = ${roll.total}`,
    position: 'top-center',
    autoClose: 5000,
    renderNotification: () => createElement(RollToast, { roll, natural }),
  })
}

function keptNatural(roll: DiceRollDto) {
  if (roll.mode === 'crit' || !/^1d20(?:[+-]\d+)?$/.test(roll.formula) || roll.rolls.length === 0)
    return null
  if (roll.mode === 'advantage')
    return Math.max(...roll.rolls)
  if (roll.mode === 'disadvantage')
    return Math.min(...roll.rolls)
  return roll.rolls[0] ?? null
}
