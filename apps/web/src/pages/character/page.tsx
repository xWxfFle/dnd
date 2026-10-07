import type { Abilities, Skill, SrdEntryDto } from '@dnd/shared'
import {
  abilities,
  abilityLabel,
  backgroundAbilitiesFromKit,
  classMasteryFromKit,
  createExpertiseNeed,
  skillChoiceFromKit,
  skillLabel,
  skills,
  weaponMasteryChoices,
  weaponMasteryCount,
} from '@dnd/shared'
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
  pack: 'Снаряжение',
  abilities: 'Характеристики',
  skills: 'Навыки',
  mastery: 'Мастерство оружия',
  expertise: 'Компетентность',
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
  const pack = useField(characterWizard.form.fields.pack)
  const backgroundAsi = useField(characterWizard.form.fields.backgroundAsi)
  const masteries = useField(characterWizard.form.fields.masteries)
  const expertise = useField(characterWizard.form.fields.expertise)
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
              const granted = skillChoiceFromKit(catalog, value, backgroundId.value)?.granted ?? []
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
              const granted = skillChoiceFromKit(catalog, classId.value, value)?.granted ?? []
              void skillPick.fill(granted)
            }}
          />
          <OriginPreview backgroundId={backgroundId.value} catalog={catalog} />
        </Stack>
      )}
      {current === 'pack' && (
        <PackChoice
          backgroundId={backgroundId.value}
          catalog={catalog}
          pack={pack.value}
          onChange={value => void pack.fill(value)}
        />
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
          <BackgroundAsi
            listed={backgroundAbilitiesFromKit(catalog, backgroundId.value)}
            bonuses={backgroundAsi.value}
            error={backgroundAsi.errors}
            onChange={value => void backgroundAsi.fill(value).then(() => backgroundAsi.validate())}
          />
        </Stack>
      )}
      {current === 'skills' && (
        <SkillChoices
          classId={classId.value}
          backgroundId={backgroundId.value}
          catalog={catalog}
          picked={skillPick.value}
          error={skillPick.errors}
          onChange={(value) => {
            void skillPick.fill(value).then(() => skillPick.validate())
          }}
        />
      )}
      {current === 'mastery' && (
        <MasteryChoices
          classId={classId.value}
          catalog={catalog}
          picked={masteries.value}
          error={masteries.errors}
          onChange={value => void masteries.fill(value).then(() => masteries.validate())}
        />
      )}
      {current === 'expertise' && (
        <ExpertiseChoices
          classId={classId.value}
          proficient={skillPick.value}
          picked={expertise.value}
          error={expertise.errors}
          onChange={value => void expertise.fill(value).then(() => expertise.validate())}
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

function PackChoice(props: {
  backgroundId: string
  catalog: SrdEntryDto[]
  pack: 'a' | 'b'
  onChange: (pack: 'a' | 'b') => void
}) {
  const entry = props.catalog.find(item => item.id === props.backgroundId)
  const equipment = typeof entry?.body.equipment === 'string' ? entry.body.equipment : ''
  return (
    <Stack gap="xs">
      <Text size="sm">Пакет А — предметы предыстории. Пакет Б — 50 зм без вещей.</Text>
      {equipment ? <Text size="sm" c="dimmed">{equipment}</Text> : null}
      <Group gap="xs">
        <Button size="xs" variant={props.pack === 'a' ? 'filled' : 'light'} onClick={() => props.onChange('a')}>Пакет А</Button>
        <Button size="xs" variant={props.pack === 'b' ? 'filled' : 'light'} onClick={() => props.onChange('b')}>Пакет Б</Button>
      </Group>
    </Stack>
  )
}

function BackgroundAsi(props: {
  listed: string[]
  bonuses: Abilities
  error: string | null
  onChange: (bonuses: Abilities) => void
}) {
  const total = abilities.reduce((sum, key) => sum + (props.bonuses[key] ?? 0), 0)
  return (
    <Stack gap="xs">
      <Text size="sm">{`Предыстория: +2 и +1 (или три +1) среди своих характеристик. Сейчас +${total}.`}</Text>
      {props.error && <Text size="sm" c="red">{props.error}</Text>}
      {props.listed.flatMap((key) => {
        if (!(key in abilityLabel))
          return []
        const ability = key as keyof Abilities
        return [(
          <NumberInput
            key={ability}
            label={`${abilityLabel[ability]} предыстории`}
            min={0}
            max={2}
            hideControls
            value={props.bonuses[ability]}
            onChange={value => props.onChange({ ...props.bonuses, [ability]: Math.max(0, Math.trunc(Number(value) || 0)) })}
          />
        )]
      })}
    </Stack>
  )
}

function MasteryChoices(props: {
  classId: string
  catalog: SrdEntryDto[]
  picked: string[]
  error: string | null
  onChange: (ids: string[]) => void
}) {
  const need = weaponMasteryCount(props.classId, classMasteryFromKit(props.catalog, props.classId))
  if (need === 0)
    return <Text size="sm" c="dimmed">Этому классу мастерство оружия не нужно.</Text>
  const toggle = (id: string) => {
    if (props.picked.includes(id)) {
      props.onChange(props.picked.filter(item => item !== id))
      return
    }
    if (props.picked.length >= need)
      return
    props.onChange([...props.picked, id])
  }
  return (
    <Stack gap="xs">
      <Text size="sm">{`Выбери ${need} оружия (${props.picked.length}/${need}).`}</Text>
      {props.error && <Text size="sm" c="red">{props.error}</Text>}
      {weaponMasteryChoices.map(item => (
        <Checkbox
          key={item.id}
          label={item.name}
          checked={props.picked.includes(item.id)}
          disabled={!props.picked.includes(item.id) && props.picked.length >= need}
          onChange={() => toggle(item.id)}
        />
      ))}
    </Stack>
  )
}

function ExpertiseChoices(props: {
  classId: string
  proficient: Skill[]
  picked: Skill[]
  error: string | null
  onChange: (skills: Skill[]) => void
}) {
  const need = createExpertiseNeed(props.classId)
  if (need === 0)
    return <Text size="sm" c="dimmed">На 1 уровне компетентность не нужна.</Text>
  const toggle = (skill: Skill) => {
    if (props.picked.includes(skill)) {
      props.onChange(props.picked.filter(item => item !== skill))
      return
    }
    if (props.picked.length >= need)
      return
    props.onChange([...props.picked, skill])
  }
  return (
    <Stack gap="xs">
      <Text size="sm">{`Компетентность: ${props.picked.length}/${need} из владений.`}</Text>
      {props.error && <Text size="sm" c="red">{props.error}</Text>}
      {props.proficient.map(skill => (
        <Checkbox
          key={skill}
          label={skillLabel[skill]}
          checked={props.picked.includes(skill)}
          disabled={!props.picked.includes(skill) && props.picked.length >= need}
          onChange={() => toggle(skill)}
        />
      ))}
    </Stack>
  )
}

function SkillChoices(props: {
  classId: string
  backgroundId: string
  catalog: SrdEntryDto[]
  picked: Skill[]
  error: string | null
  onChange: (skills: Skill[]) => void
}) {
  const choice = skillChoiceFromKit(props.catalog, props.classId, props.backgroundId)
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
