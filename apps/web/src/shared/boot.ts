import type { Skill } from '@dnd/shared'
import { skillOfferForClass } from '@dnd/shared'
import { reaction, scoped } from '@virentia/core'
import { createField, createForm, createWizardForm, readStoreSnapshot, step } from '@virentia/forms'

import { zodFieldValidator } from '@virentia/forms-zod'
import { trigger } from '@virentia/net-core'
import { z } from 'zod'
import { bootHome } from '@/pages/home/model'
import { bootTable } from '@/pages/table/live'
import { bootTableModel } from '@/pages/table/model'
import { bootRollToasts } from '@/pages/table/roll-toast'
import {
  campaignsQuery,
  createCampaignMutation,
  createCharacterMutation,
  joinMutation,
  loginMutation,
  meQuery,
  registerMutation,
  snapshotQuery,
  srdQuery,
} from './api'
import { characterRoute, homeRoute, joinRoute, loginRoute, tableRoute } from './routing'
import { appScope, currentUser, token } from './session'

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

const abilityField = () => createField(10, { validate: zodFieldValidator(z.number().int().min(1).max(30)) })

const classIdField = createField('class-fighter')

const skillsField = createField<Skill[]>([], {
  validate(value, ctx) {
    const offer = skillOfferForClass(ctx.read(classIdField.state))
    if (!offer)
      return 'Неизвестный класс'
    if (new Set(value).size !== value.length)
      return 'Навыки без повторов'
    const allowed = new Set<string>(offer.skills)
    if (value.some(skill => !allowed.has(skill)))
      return 'Навык не из списка класса'
    if (value.length !== offer.skillChoices)
      return `Нужно навыков: ${offer.skillChoices}`
    return null
  },
})

export const characterWizard = createWizardForm({
  schema: {
    classId: classIdField,
    speciesId: createField('species-human'),
    backgroundId: createField('background-soldier'),
    str: abilityField(),
    dex: abilityField(),
    con: abilityField(),
    int: abilityField(),
    wis: abilityField(),
    cha: abilityField(),
    skills: skillsField,
    name: createField('Герой', { validate: zodFieldValidator(z.string().min(1)) }),
  },
  steps: form => [
    step('class', { form: form.pick({ classId: true }) }),
    step('origin', { form: form.pick({ speciesId: true, backgroundId: true }) }),
    step('abilities', { form: form.pick({ str: true, dex: true, con: true, int: true, wis: true, cha: true }) }),
    step('skills', { form: form.pick({ classId: true, skills: true }) }),
    step('name', { form: form.pick({ name: true }) }),
  ],
})

export function bootClient() {
  scoped(appScope, () => {
    reaction({
      on: loginForm.submitted,
      run() {
        const values = readStoreSnapshot(loginForm.values)
        void loginMutation({ email: values.email, password: values.password })
      },
    })
    reaction({
      on: registerForm.submitted,
      run() {
        const values = readStoreSnapshot(registerForm.values)
        void registerMutation({
          displayName: values.displayName,
          email: values.email,
          password: values.password,
        })
      },
    })
    reaction({
      on: loginMutation.doneData,
      run(result) {
        token.value = result.accessToken
        currentUser.value = result.user
        void homeRoute.open({ replace: true })
      },
    })
    reaction({
      on: registerMutation.doneData,
      run(result) {
        token.value = result.accessToken
        currentUser.value = result.user
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
      on: classIdField.changed,
      run() {
        void skillsField.fill([])
      },
    })
    reaction({
      on: characterWizard.completed,
      run() {
        const campaignId = openedCampaignId()
        const values = readStoreSnapshot(characterWizard.form.values)
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
            skillProficiencies: values.skills,
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
      on: meQuery.doneData,
      run(result) {
        currentUser.value = result.user
      },
    })
    if (token.value && !currentUser.value)
      void meQuery(undefined)
    reaction({
      on: joinRoute.opened,
      run() {
        const code = joinRoute.params.value.code
        if (code)
          void joinMutation(code)
      },
    })
  })
  bootHome()
  bootTable()
  bootTableModel()
  bootRollToasts()
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
    currentUser.value = null
    void loginRoute.open({ replace: true })
  })
}
