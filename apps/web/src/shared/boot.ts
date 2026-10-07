import type { Skill } from '@dnd/shared'
import {
  acceptBackgroundAsi,
  acceptExpertisePicks,
  acceptSkillChoiceFromKit,
  acceptWeaponMasteries,
  backgroundAbilitiesFromKit,
  classMasteryFromKit,
  createExpertiseNeed,
  emptyBackgroundAsi,
  skillChoiceFromKit,
} from '@dnd/shared'
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
  lanHostsQuery,
  loginMutation,
  meQuery,
  registerMutation,
  snapshotQuery,
  srdGearQuery,
  srdKitQuery,
  srdSpellsQuery,
} from './api'
import { characterRoute, homeRoute, joinRoute, loginRoute, registerRoute, tableRoute } from './routing'
import { appScope, currentUser, signedOut, token } from './session'

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
const backgroundIdField = createField('background-soldier')

const kitEntries = () => srdKitQuery.data.value ?? []

const skillsField = createField<Skill[]>(['athletics', 'intimidation'], {
  validate(value, ctx) {
    if (new Set(value).size !== value.length)
      return 'Навыки без повторов'
    const classId = ctx.read(classIdField.state)
    const backgroundId = ctx.read(backgroundIdField.state)
    const kit = kitEntries()
    if (!acceptSkillChoiceFromKit(value, classId, backgroundId, kit))
      return `Навыков сверх предыстории должно быть ${skillChoiceFromKit(kit, classId, backgroundId)?.skillChoices ?? 0}`
    return null
  },
  validationStrategies: ['change', 'submit'],
})

const backgroundAsiField = createField(emptyBackgroundAsi(), {
  validate(value, ctx) {
    const listed = backgroundAbilitiesFromKit(kitEntries(), ctx.read(backgroundIdField.state))
    return acceptBackgroundAsi(listed, value) ? null : 'Распредели +2 и +1 среди характеристик предыстории'
  },
  validationStrategies: ['change', 'submit'],
})

const packField = createField<'a' | 'b'>('a')

const masteriesField = createField<string[]>([], {
  validate(value, ctx) {
    const classId = ctx.read(classIdField.state)
    return acceptWeaponMasteries(value, classId, classMasteryFromKit(kitEntries(), classId)) ? null : 'Выбери мастерство оружия'
  },
  validationStrategies: ['change', 'submit'],
})

const expertiseField = createField<Skill[]>([], {
  validate(value, ctx) {
    const classId = ctx.read(classIdField.state)
    const picked = ctx.read(skillsField.state)
    return acceptExpertisePicks(value, picked, createExpertiseNeed(classId)) ? null : 'Выбери компетентность'
  },
  validationStrategies: ['change', 'submit'],
})

export const characterWizard = createWizardForm({
  schema: {
    classId: classIdField,
    speciesId: createField('species-human'),
    backgroundId: backgroundIdField,
    str: abilityField(),
    dex: abilityField(),
    con: abilityField(),
    int: abilityField(),
    wis: abilityField(),
    cha: abilityField(),
    backgroundAsi: backgroundAsiField,
    pack: packField,
    skills: skillsField,
    masteries: masteriesField,
    expertise: expertiseField,
    name: createField('Герой', { validate: zodFieldValidator(z.string().min(1)) }),
  },
  steps: form => [
    step('class', { form: form.pick({ classId: true }) }),
    step('origin', { form: form.pick({ speciesId: true, backgroundId: true }) }),
    step('pack', { form: form.pick({ pack: true }) }),
    step('abilities', { form: form.pick({ str: true, dex: true, con: true, int: true, wis: true, cha: true, backgroundAsi: true }) }),
    step('skills', { form: form.pick({ classId: true, backgroundId: true, skills: true }) }),
    step('mastery', { form: form.pick({ classId: true, masteries: true }) }),
    step('expertise', { form: form.pick({ classId: true, skills: true, expertise: true }) }),
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
      on: characterWizard.completed,
      run() {
        const campaignId = openedCampaignId()
        const values = readStoreSnapshot(characterWizard.form.values)
        if (!campaignId)
          return
        const kit = kitEntries()
        const skills = acceptSkillChoiceFromKit(values.skills, values.classId, values.backgroundId, kit)
        if (!skills)
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
            backgroundBonuses: values.backgroundAsi,
            startingPack: values.pack,
            skillProficiencies: skills,
            weaponMasteries: values.masteries,
            expertiseSkills: values.expertise,
          },
        })
      },
    })
    reaction({
      on: characterRoute.opened,
      run() {
        void resetCharacterWizard()
      },
    })
    reaction({
      on: createCharacterMutation.doneData,
      run(character) {
        void resetCharacterWizard()
        void tableRoute.open({ params: { id: character.campaignId }, replace: true })
      },
    })
    trigger(campaignsQuery, {
      on: homeRoute.opened,
      filter: () => Boolean(token.value),
    })
    trigger(lanHostsQuery, {
      on: homeRoute.opened,
      filter: () => Boolean(token.value),
    })
    trigger(srdKitQuery, { on: [characterRoute.opened, tableRoute.opened] })
    trigger(srdGearQuery, { on: tableRoute.opened })
    trigger(srdSpellsQuery, { on: tableRoute.opened })
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
    reaction({
      on: signedOut,
      run() {
        if (!loginRoute.isOpened.value && !registerRoute.isOpened.value)
          void loginRoute.open({ replace: true })
      },
    })
    if (token.value)
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

async function resetCharacterWizard() {
  await characterWizard.reset()
  await characterWizard.goTo('class')
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
    signedOut()
    void loginRoute.open({ replace: true })
  })
}
