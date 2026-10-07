import type { Skill, SrdEntryDto } from '@dnd/shared'
import { abilities, abilityLabel, skillChoiceForOrigin, skillLabel, skills } from '@dnd/shared'
import { Button, Checkbox, Group, NumberInput, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { useField, useWizard } from '@virentia/forms-react'
import { useUnit } from '@virentia/react'
import { srdKitQuery } from '@/shared/api'
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
    entries: srdKitQuery.data,
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
        <Stack>
          <Select
            label="Класс"
            data={options('class')}
            value={classId.value}
            onChange={(value) => {
              if (!value)
                return
              void classId.fill(value)
              const granted = skillChoiceForOrigin(value, backgroundId.value)?.granted ?? []
              void skillPick.fill(granted)
            }}
          />
          <ClassPreview classId={classId.value} catalog={catalog} />
        </Stack>
      )}
      {current === 'origin' && (
        <Stack>
          <Select label="Вид" data={options('species')} value={speciesId.value} onChange={value => value && void speciesId.fill(value)} />
          <Select
            label="Предыстория"
            data={options('background')}
            value={backgroundId.value}
            onChange={(value) => {
              if (!value)
                return
              void backgroundId.fill(value)
              const granted = skillChoiceForOrigin(classId.value, value)?.granted ?? []
              void skillPick.fill(granted)
            }}
          />
          <OriginPreview backgroundId={backgroundId.value} catalog={catalog} />
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
          backgroundId={backgroundId.value}
          picked={skillPick.value}
          error={skillPick.errors}
          onChange={(value) => {
            void skillPick.fill(value).then(() => skillPick.validate())
          }}
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

function ClassPreview(props: { classId: string, catalog: SrdEntryDto[] }) {
  const entry = props.catalog.find(item => item.id === props.classId)
  if (!entry)
    return null
  const hitDie = typeof entry.body.hitDie === 'string' ? entry.body.hitDie : ''
  const saves = Array.isArray(entry.body.saves)
    ? entry.body.saves.filter((item): item is keyof typeof abilityLabel => typeof item === 'string' && item in abilityLabel).map(item => abilityLabel[item])
    : []
  const skillChoices = Number(entry.body.skillChoices ?? 0)
  return (
    <Text size="sm" c="dimmed">
      {`Кость хитов ${hitDie}. Спасброски: ${saves.join(', ') || '—'}. Навыков на выбор: ${skillChoices}.`}
    </Text>
  )
}

function OriginPreview(props: { backgroundId: string, catalog: SrdEntryDto[] }) {
  const entry = props.catalog.find(item => item.id === props.backgroundId)
  if (!entry)
    return null
  const featId = typeof entry.body.originFeatId === 'string' ? entry.body.originFeatId : ''
  const feat = props.catalog.find(item => item.id === featId)
  const featName = feat?.name ?? (typeof entry.body.originFeatName === 'string' ? entry.body.originFeatName : '')
  const granted = Array.isArray(entry.body.skills)
    ? entry.body.skills.filter((item): item is Skill => typeof item === 'string' && item in skillLabel).map(item => skillLabel[item])
    : []
  const tools = typeof entry.body.tools === 'string' ? entry.body.tools : ''
  const equipment = typeof entry.body.equipment === 'string' ? entry.body.equipment : ''
  const text = typeof entry.body.text === 'string' ? entry.body.text : ''
  return (
    <Stack gap={4}>
      <Text size="sm" c="dimmed">
        {`Навыки фона: ${granted.join(', ') || '—'}. Черта происхождения: ${featName || '—'}.${tools ? ` Инструменты: ${tools}.` : ''}`}
      </Text>
      {equipment ? <Text size="sm" c="dimmed">{`Снаряжение: ${equipment}`}</Text> : null}
      {text ? <Text size="sm" c="dimmed">{text}</Text> : null}
    </Stack>
  )
}

const skillSourceLabel = {
  background: 'предыстория',
  class: 'список класса',
  other: 'вне списка класса',
} as const

function skillSource(skill: Skill, granted: Set<string>, suggested: Set<string>) {
  if (granted.has(skill))
    return 'background' as const
  if (suggested.has(skill))
    return 'class' as const
  return 'other' as const
}

function SkillChoices(props: {
  classId: string
  backgroundId: string
  picked: Skill[]
  error: string | null
  onChange: (skills: Skill[]) => void
}) {
  const choice = skillChoiceForOrigin(props.classId, props.backgroundId)
  const granted = choice?.granted ?? []
  const grantedSet = new Set<string>(granted)
  const suggestedSet = new Set<string>(choice?.suggested ?? [])
  const choices = choice?.skillChoices ?? 0
  const pickedClass = props.picked.filter(skill => !grantedSet.has(skill))
  const atMax = pickedClass.length >= choices
  const toggle = (skill: Skill) => {
    if (grantedSet.has(skill))
      return
    if (pickedClass.includes(skill)) {
      props.onChange([...granted, ...pickedClass.filter(item => item !== skill)])
      return
    }
    if (atMax)
      return
    props.onChange([...granted, ...pickedClass, skill])
  }
  return (
    <Stack gap="xs">
      <Text size="sm">
        {`Фон даёт ${granted.length}, класс — ещё ${choices} (${pickedClass.length}/${choices}). Брать можно любой навык, список класса отмечен как подсказка.`}
      </Text>
      {props.error && <Text size="sm" c="red">{props.error}</Text>}
      {skills.map((skill) => {
        const source = skillSource(skill, grantedSet, suggestedSet)
        const picked = source === 'background' || props.picked.includes(skill)
        const locked = source === 'background' || (atMax && !pickedClass.includes(skill))
        return (
          <Checkbox
            key={skill}
            label={`${skillLabel[skill]} · ${skillSourceLabel[source]}`}
            checked={picked}
            disabled={locked}
            onChange={() => toggle(skill)}
          />
        )
      })}
    </Stack>
  )
}
