import { event, reaction, scoped } from '@virentia/core'
import { createField } from '@virentia/forms'
import { zodFieldValidator } from '@virentia/forms-zod'
import { z } from 'zod'
import { createCampaignMutation } from '@/shared/api'
import { tableRoute } from '@/shared/routing'
import { appScope } from '@/shared/session'

export const campaignName = createField('Новая кампания', { validate: zodFieldValidator(z.string().min(1)) })

export const campaignCreateRequested = event<void>()
export const campaignOpened = event<string>()

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
  })
}
