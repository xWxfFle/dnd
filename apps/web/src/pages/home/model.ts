import { event, reaction, scoped, store } from '@virentia/core'
import { createField } from '@virentia/forms'
import { zodFieldValidator } from '@virentia/forms-zod'
import { z } from 'zod'
import { createCampaignMutation, deleteCampaignMutation, joinMutation } from '@/shared/api'
import { characterRoute, homeRoute, tableRoute } from '@/shared/routing'
import { appScope } from '@/shared/session'

export const campaignName = createField('Новая кампания', { validate: zodFieldValidator(z.string().min(1)) })
export const joinCode = createField('', { validate: zodFieldValidator(z.string().trim().min(1)) })

export const pendingCampaignDelete = store<string | null>(null)
export const campaignDeletePending = deleteCampaignMutation.pending

export const campaignCreateRequested = event<void>()
export const campaignOpened = event<string>()
export const joinRequested = event<void>()
export const campaignDeletePressed = event<string>()
export const campaignDeleteDismissed = event<void>()
export const campaignDeleteConfirmed = event<void>()

export function bootHome() {
  scoped(appScope, () => {
    reaction({
      on: campaignCreateRequested,
      run() {
        void createCampaignMutation(campaignName.read())
      },
    })
    reaction({
      on: campaignOpened,
      run(id) {
        void tableRoute.open({ params: { id } })
      },
    })
    reaction({
      on: joinRequested,
      run() {
        const code = codeFromInvite(joinCode.read())
        if (!code)
          return
        void joinMutation(code)
      },
    })
    reaction({
      on: campaignDeletePressed,
      run(id) {
        pendingCampaignDelete.value = id
      },
    })
    reaction({
      on: campaignDeleteDismissed,
      run() {
        pendingCampaignDelete.value = null
      },
    })
    reaction({
      on: campaignDeleteConfirmed,
      run() {
        const id = pendingCampaignDelete.value
        if (!id)
          return
        void deleteCampaignMutation(id)
      },
    })
    reaction({
      on: deleteCampaignMutation.doneData,
      run() {
        const id = pendingCampaignDelete.value
        pendingCampaignDelete.value = null
        const onTable = tableRoute.isOpened.value && tableRoute.params.value.id === id
        const onHero = characterRoute.isOpened.value && characterRoute.params.value.id === id
        if (onTable || onHero)
          void homeRoute.open({ replace: true })
      },
    })
  })
}

function codeFromInvite(raw: string) {
  const piece = raw.trim().split('/').filter(Boolean).at(-1) ?? ''
  return piece.split('?')[0]?.split('#')[0] ?? ''
}
