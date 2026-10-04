import { event, reaction, scoped } from '@virentia/core'
import { createField } from '@virentia/forms'
import { zodFieldValidator } from '@virentia/forms-zod'
import { z } from 'zod'
import { createCampaignMutation, joinMutation } from '@/shared/api'
import { tableRoute } from '@/shared/routing'
import { appScope } from '@/shared/session'

export const campaignName = createField('Новая кампания', { validate: zodFieldValidator(z.string().min(1)) })
export const joinCode = createField('', { validate: zodFieldValidator(z.string().trim().min(1)) })

export const campaignCreateRequested = event<void>()
export const campaignOpened = event<string>()
export const joinRequested = event<void>()

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
  })
}

function codeFromInvite(raw: string) {
  const piece = raw.trim().split('/').filter(Boolean).at(-1) ?? ''
  return piece.split('?')[0]?.split('#')[0] ?? ''
}
