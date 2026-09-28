import { abilities, abilityLabel } from '@dnd/shared'
import { Button, Group, NumberInput, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { useField, useWizard } from '@virentia/forms-react'
import { useQuery } from '@virentia/net-react'
import { srdQuery } from '@/shared/api'
import { characterWizard } from '@/shared/boot'

const stepTitle = {
  class: 'Класс',
  origin: 'Происхождение',
  abilities: 'Характеристики',
  name: 'Имя',
} as const

export function CharacterPage() {
  const wizard = useWizard(characterWizard)
  const srd = useQuery(srdQuery)
  const entries = srd.data ?? []
  const classId = useField(characterWizard.form.fields.classId)
  const speciesId = useField(characterWizard.form.fields.speciesId)
  const backgroundId = useField(characterWizard.form.fields.backgroundId)
  const name = useField(characterWizard.form.fields.name)
  const scores = {
    str: useField(characterWizard.form.fields.str),
    dex: useField(characterWizard.form.fields.dex),
    con: useField(characterWizard.form.fields.con),
    int: useField(characterWizard.form.fields.int),
    wis: useField(characterWizard.form.fields.wis),
    cha: useField(characterWizard.form.fields.cha),
  }
  const current = String(wizard.currentId)
  const options = (kind: string) => entries.filter(entry => entry.kind === kind).map(entry => ({ value: entry.id, label: entry.name }))
  return (
    <Stack maw={640} mx="auto" p="md">
      <Title order={2}>Новый персонаж</Title>
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
