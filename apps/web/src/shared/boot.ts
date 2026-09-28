import { reaction, scoped } from '@virentia/core'
import { createField, createForm, createWizardForm, readStoreSnapshot, step } from '@virentia/forms'

import { zodFieldValidator } from '@virentia/forms-zod'
import { trigger } from '@virentia/net-core'
import { z } from 'zod'
import { bootTable } from '@/pages/table/live'
import {
  campaignsQuery,
  createCampaignMutation,
  createCharacterMutation,
  joinMutation,
  loginMutation,
  registerMutation,
  snapshotQuery,
  srdQuery,
} from './api'
import { characterRoute, homeRoute, joinRoute, loginRoute, tableRoute } from './routing'
import { appScope, token } from './session'

export const loginForm = createForm({
  schema: {
    email: createField('dm@table.local', { validate: zodFieldValidator(z.email()) }),
    password: createField('password123', { validate: zodFieldValidator(z.string().min(1)) }),
  },
  validationStrategies: ['submit'],
})

export const registerForm = createForm({
  schema: {
    displayName: createField('', { validate: zodFieldValidator(z.string().min(1)) }),
    email: createField('', { validate: zodFieldValidator(z.email()) }),
    password: createField('', { validate: zodFieldValidator(z.string().min(8)) }),
  },
  validationStrategies: ['submit'],
})

export const campaignName = createField('Новая кампания', { validate: zodFieldValidator(z.string().min(1)) })

const abilityField = () => createField(10, { validate: zodFieldValidator(z.number().int().min(1).max(30)) })

export const characterWizard = createWizardForm({
  schema: {
    classId: createField('class-fighter'),
    speciesId: createField('species-human'),
    backgroundId: createField('background-soldier'),
    str: abilityField(),
    dex: abilityField(),
    con: abilityField(),
    int: abilityField(),
    wis: abilityField(),
    cha: abilityField(),
    name: createField('Герой', { validate: zodFieldValidator(z.string().min(1)) }),
  },
  steps: form => [
    step('class', { form: form.pick({ classId: true }) }),
    step('origin', { form: form.pick({ speciesId: true, backgroundId: true }) }),
    step('abilities', { form: form.pick({ str: true, dex: true, con: true, int: true, wis: true, cha: true }) }),
    step('name', { form: form.pick({ name: true }) }),
  ],
})

function valuesOf<T>(unit: { value?: T } | Parameters<typeof readStoreSnapshot>[0]) {
  return readStoreSnapshot(unit as Parameters<typeof readStoreSnapshot>[0])
}

export function bootClient() {
  scoped(appScope, () => {
    reaction({
      on: loginForm.submitted,
      run() {
        void loginMutation(valuesOf(loginForm.values) as { email: string, password: string })
      },
    })
    reaction({
      on: registerForm.submitted,
      run() {
        const values = valuesOf(registerForm.values) as { displayName: string, email: string, password: string }
        void registerMutation(values)
      },
    })
    reaction({
      on: loginMutation.doneData,
      run(result) {
        token.value = result.accessToken
        void homeRoute.open({ replace: true })
      },
    })
    reaction({
      on: registerMutation.doneData,
      run(result) {
        token.value = result.accessToken
        void homeRoute.open({ replace: true })
      },
    })
    reaction({
      on: createCampaignMutation.doneData,
      run(campaign) {
        void tableRoute.open({ params: { id: campaign.id } })
      },
    })
    reaction({
      on: joinMutation.doneData,
      run(campaign) {
        void tableRoute.open({ params: { id: campaign.id }, replace: true })
      },
    })
    reaction({
      on: characterWizard.completed,
      run() {
        const campaignId = openedCampaignId()
        const values = valuesOf(characterWizard.form.values) as {
          name: string
          classId: string
          speciesId: string
          backgroundId: string
          str: number
          dex: number
          con: number
          int: number
          wis: number
          cha: number
        }
        if (!campaignId)
          return
        void createCharacterMutation({
          campaignId,
          body: {
            name: values.name,
            classId: values.classId,
            speciesId: values.speciesId,
            backgroundId: values.backgroundId,
            abilities: {
              str: values.str,
              dex: values.dex,
              con: values.con,
              int: values.int,
              wis: values.wis,
              cha: values.cha,
            },
          },
        })
      },
    })
    reaction({
      on: createCharacterMutation.doneData,
      run(character) {
        void tableRoute.open({ params: { id: character.campaignId }, replace: true })
      },
    })
    trigger(campaignsQuery, { on: homeRoute.opened })
    trigger(srdQuery, { on: [characterRoute.opened, tableRoute.opened] })
    trigger(snapshotQuery, {
      on: [tableRoute.opened, characterRoute.opened],
      params: () => openedCampaignId(),
      filter: () => Boolean(openedCampaignId()),
    })
    reaction({
      on: joinRoute.opened,
      run() {
        const code = joinRoute.params.value.code
        if (code)
          void joinMutation(code)
      },
    })
  })
  bootTable()
}

function openedCampaignId() {
  if (tableRoute.isOpened.value)
    return tableRoute.params.value.id
  if (characterRoute.isOpened.value)
    return characterRoute.params.value.id
  return ''
}

export function signOut() {
  scoped(appScope, () => {
    token.value = null
    void loginRoute.open({ replace: true })
  })
}
