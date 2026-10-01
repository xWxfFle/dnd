import type { Skill } from '@dnd/shared'
import { abilities, abilityLabel, skillLabel, skillOfferForClass, skills } from '@dnd/shared'
import { Button, Checkbox, Group, NumberInput, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { useField, useWizard } from '@virentia/forms-react'
import { useUnit } from '@virentia/react'
import { srdQuery } from '@/shared/api'
import { characterWizard } from '@/shared/boot'
import { characterRoute, tableRoute } from '@/shared/routing'
import { AccountMenu } from '@/shared/ui/account-menu'

const stepTitle = {
  class: 'Класс',
  origin: 'Происхождение',
  abilities: 'Характеристики',
  skills: 'Навыки',
  name: 'Имя',
} as const

export function CharacterPage() {
  const wizard = useWizard(characterWizard)
  const { entries, campaign, backToTable } = useUnit({
    entries: srdQuery.data,
    campaign: characterRoute.params,
    backToTable: tableRoute.open,
  })
  const catalog = entries ?? []
  const classId = useField(characterWizard.form.fields.classId)
  const speciesId = useField(characterWizard.form.fields.speciesId)
  const backgroundId = useField(characterWizard.form.fields.backgroundId)
  const name = useField(characterWizard.form.fields.name)
  const skillPick = useField(characterWizard.form.fields.skills)
  const scores = {
    str: useField(characterWizard.form.fields.str),
    dex: useField(characterWizard.form.fields.dex),
    con: useField(characterWizard.form.fields.con),
    int: useField(characterWizard.form.fields.int),
    wis: useField(characterWizard.form.fields.wis),
    cha: useField(characterWizard.form.fields.cha),
  }
  const current = String(wizard.currentId)
  const options = (kind: string) => catalog.filter(entry => entry.kind === kind).map(entry => ({ value: entry.id, label: entry.name }))
  return (
    <Stack maw={640} mx="auto" p="md">
      <Group justify="space-between">
        <Title order={2}>Новый персонаж</Title>
        <Group gap="xs">
          <Button variant="default" onClick={() => void backToTable({ params: { id: campaign.id } })}>К столу</Button>
          <AccountMenu />
        </Group>
      </Group>
      <Text c="dimmed">{stepTitle[current as keyof typeof stepTitle] ?? current}</Text>
      {current === 'class' && (
        <Select label="Класс" data={options('class')} value={classId.value} onChange={value => value && void classId.fill(value)} />
      )}
      {current === 'origin' && (
        <Stack>
          <Select label="Вид" data={options('species')} value={speciesId.value} onChange={value => value && void speciesId.fill(value)} />
          <Select label="Предыстория" data={options('background')} value={backgroundId.value} onChange={value => value && void backgroundId.fill(value)} />
        </Stack>
      )}
      {current === 'abilities' && (
        <Stack>
          {abilities.map(ability => (
            <NumberInput
              key={ability}
              label={abilityLabel[ability]}
              value={scores[ability].value}
              onChange={value => void scores[ability].fill(Number(value))}
            />
          ))}
        </Stack>
      )}
      {current === 'skills' && (
        <SkillChoices
          classId={classId.value}
          picked={skillPick.value}
          error={skillPick.errors}
          onChange={value => void skillPick.fill(value)}
        />
      )}
      {current === 'name' && (
        <TextInput label="Имя" value={name.value} onChange={event => void name.fill(event.currentTarget.value)} />
      )}
      <Group>
        <Button variant="default" disabled={!wizard.canGoBack} onClick={() => void wizard.back()}>Назад</Button>
        {wizard.canGoNext
          ? <Button onClick={() => void wizard.next()}>Дальше</Button>
          : <Button onClick={() => void wizard.complete()}>Создать</Button>}
      </Group>
    </Stack>
  )
}

function SkillChoices(props: {
  classId: string
  picked: Skill[]
  error: string | null
  onChange: (skills: Skill[]) => void
}) {
  const offer = skillOfferForClass(props.classId)
  const choices = offer?.skillChoices ?? 0
  return (
    <Checkbox.Group
      label="Навыки"
      description={`Выбрано ${props.picked.length} из ${choices}`}
      value={props.picked}
      error={props.error ?? undefined}
      maxSelectedValues={choices}
      onChange={value => props.onChange(value.filter(isSkill))}
    >
      <Stack gap="xs" mt="xs">
        {(offer?.skills ?? []).map(skill => (
          <Checkbox key={skill} value={skill} label={skillLabel[skill]} />
        ))}
      </Stack>
    </Checkbox.Group>
  )
}

function isSkill(value: string): value is Skill {
  return (skills as readonly string[]).includes(value)
}
