import type { CharacterDto, SpellSlot, SrdEntryDto } from '@dnd/shared'
import { readClassFeatures, readSpellIds } from '@dnd/shared'
import { Button, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import { sendLive } from '@/pages/table/live'
import { apiFetch } from '@/shared/api'

export function ClassKit(props: { sheet: CharacterDto, entries: SrdEntryDto[] }) {
  const [error, setError] = useState('')
  const classEntry = props.entries.find(entry => entry.id === props.sheet.classId)
  const features = classEntry ? readClassFeatures(classEntry.body) : []
  const subclassName = typeof classEntry?.body.subclassName === 'string' ? classEntry.body.subclassName : ''
  const spells = readSpellIds(classEntry?.body ?? {})
    .map(id => props.entries.find(entry => entry.id === id))
    .filter((entry): entry is SrdEntryDto => entry != null)

  function spendSlot(level: number) {
    if (level <= 0)
      return true
    const slots = props.sheet.slots.map(slot => ({ ...slot }))
    const slot = slots.find(item => item.level >= level && item.spent < item.max)
    if (!slot) {
      setError('Нет свободной ячейки')
      return false
    }
    slot.spent += 1
    setError('')
    void apiFetch(`/api/campaigns/${props.sheet.campaignId}/characters/${props.sheet.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ slots }),
    })
    return true
  }

  function applyFeature(feature: { name: string, formula?: string }) {
    setError('')
    if (feature.formula) {
      sendLive({ type: 'roll', label: feature.name, formula: feature.formula, mode: 'normal' })
      return
    }
    const active = props.sheet.conditions.includes(feature.name)
    const conditions = active
      ? props.sheet.conditions.filter(item => item !== feature.name)
      : [...props.sheet.conditions, feature.name]
    void apiFetch(`/api/campaigns/${props.sheet.campaignId}/characters/${props.sheet.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ conditions }),
    })
  }

  function castSpell(spell: SrdEntryDto) {
    const level = Number(spell.body.level ?? 0)
    const dice = typeof spell.body.dice === 'string' ? spell.body.dice : ''
    if (!spendSlot(level))
      return
    if (!dice.includes('d'))
      return
    sendLive({ type: 'roll', label: spell.name, formula: dice, mode: 'normal' })
  }

  return (
    <Stack gap="sm">
      <Text size="sm" fw={600}>{subclassName ? `${classEntry?.name ?? 'Класс'} · ${subclassName}` : classEntry?.name}</Text>
      {features.map(feature => (
        <Stack key={feature.id} gap={4}>
          <Text size="sm" fw={600}>{feature.subclass ? `${feature.name} · подкласс` : feature.name}</Text>
          <Text size="sm" c="dimmed">{feature.text}</Text>
          <Button size="xs" variant={featureButtonVariant(feature, props.sheet.conditions)} onClick={() => applyFeature(feature)}>
            {featureLabel(feature, props.sheet.conditions)}
          </Button>
        </Stack>
      ))}
      {spells.map(spell => (
        <Stack key={spell.id} gap={4}>
          <Text size="sm" fw={600}>
            {Number(spell.body.level ?? 0) > 0 ? `${spell.name} · ${String(spell.body.level)} круг` : `${spell.name} · заговор`}
          </Text>
          <Button size="xs" variant="light" onClick={() => castSpell(spell)}>
            {spellHasDice(spell) ? 'Бросить' : 'Ячейка'}
          </Button>
        </Stack>
      ))}
      <SlotLine slots={props.sheet.slots} />
      {error ? <Text size="xs" c="red">{error}</Text> : null}
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

function SlotLine(props: { slots: SpellSlot[] }) {
  if (props.slots.length === 0)
    return null
  return (
    <>
      {props.slots.map(slot => (
        <Text key={slot.level} size="sm">
          {`Ячейки ${slot.level}: ${slot.max - slot.spent}/${slot.max}`}
        </Text>
      ))}
    </>
  )
}
