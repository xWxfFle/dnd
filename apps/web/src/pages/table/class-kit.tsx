import type { CharacterDto, SrdEntryDto } from '@dnd/shared'
import { readClassFeatures, readSpellIds } from '@dnd/shared'
import { Button, Stack, Text } from '@mantine/core'
import { useUnit } from '@virentia/react'
import { srdQuery } from '@/shared/api'
import { featureUsed, kitError, spellCast } from './model'

export function ClassKit(props: { sheet: CharacterDto }) {
  const { entries, error, applyFeature, cast } = useUnit({
    entries: srdQuery.data,
    error: kitError,
    applyFeature: featureUsed,
    cast: spellCast,
  })
  const classEntry = (entries ?? []).find(entry => entry.id === props.sheet.classId)
  const features = classEntry ? readClassFeatures(classEntry.body) : []
  const subclassName = typeof classEntry?.body.subclassName === 'string' ? classEntry.body.subclassName : ''
  const spells = readSpellIds(classEntry?.body ?? {})
    .map(id => (entries ?? []).find(entry => entry.id === id))
    .filter((entry): entry is SrdEntryDto => entry != null)
  const message = error?.characterId === props.sheet.id ? error.message : ''
  return (
    <Stack gap="sm">
      <Text size="sm" fw={600}>{subclassName ? `${classEntry?.name ?? 'Класс'} · ${subclassName}` : classEntry?.name}</Text>
      {features.map(feature => (
        <Stack key={feature.id} gap={4}>
          <Text size="sm" fw={600}>{feature.subclass ? `${feature.name} · подкласс` : feature.name}</Text>
          <Text size="sm" c="dimmed">{feature.text}</Text>
          <Button size="xs" variant={featureButtonVariant(feature, props.sheet.conditions)} onClick={() => applyFeature({ characterId: props.sheet.id, featureId: feature.id })}>
            {featureLabel(feature, props.sheet.conditions)}
          </Button>
        </Stack>
      ))}
      {spells.map(spell => (
        <Stack key={spell.id} gap={4}>
          <Text size="sm" fw={600}>
            {Number(spell.body.level ?? 0) > 0 ? `${spell.name} · ${String(spell.body.level)} круг` : `${spell.name} · заговор`}
          </Text>
          <Button size="xs" variant="light" onClick={() => cast({ characterId: props.sheet.id, spellId: spell.id })}>
            {spellHasDice(spell) ? 'Бросить' : 'Ячейка'}
          </Button>
        </Stack>
      ))}
      {message ? <Text size="xs" c="red">{message}</Text> : null}
    </Stack>
  )
}

function featureButtonVariant(feature: { name: string, formula?: string }, conditions: string[]) {
  if (feature.formula)
    return 'light' as const
  if (conditions.includes(feature.name))
    return 'filled' as const
  return 'default' as const
}

function featureLabel(feature: { name: string, formula?: string }, conditions: string[]) {
  if (feature.formula)
    return 'Бросить'
  if (conditions.includes(feature.name))
    return 'Снять'
  return 'Включить'
}

function spellHasDice(spell: SrdEntryDto) {
  return typeof spell.body.dice === 'string' && spell.body.dice.includes('d')
}
