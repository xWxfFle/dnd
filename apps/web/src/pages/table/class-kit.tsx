import type { CharacterDto, KnownSpell, SrdEntryDto } from '@dnd/shared'
import { readClassFeatures } from '@dnd/shared'
import { ActionIcon, Button, Divider, Group, Modal, NumberInput, Paper, Select, Stack, Text, TextInput } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { srdQuery } from '@/shared/api'
import { featureUsed, kitError, spellCast, spellsReplaced } from './model'

export function ClassKit(props: { sheet: CharacterDto }) {
  const { entries, error, applyFeature, cast, replaceSpells } = useUnit({
    entries: srdQuery.data,
    error: kitError,
    applyFeature: featureUsed,
    cast: spellCast,
    replaceSpells: spellsReplaced,
  })
  const [open, setOpen] = useState(false)
  const classEntry = (entries ?? []).find(entry => entry.id === props.sheet.classId)
  const features = classEntry ? readClassFeatures(classEntry.body) : []
  const subclassName = typeof classEntry?.body.subclassName === 'string' ? classEntry.body.subclassName : ''
  const message = error?.characterId === props.sheet.id ? error.message : ''
  const catalog = (entries ?? []).filter(entry => entry.kind === 'spell')
  const replace = (spells: KnownSpell[]) => replaceSpells({ characterId: props.sheet.id, spells })
  return (
    <Stack gap="sm">
      <Text size="sm" fw={600}>{subclassName ? `${classEntry?.name ?? 'Класс'} · ${subclassName}` : classEntry?.name}</Text>
      {features.map(feature => (
        <Paper key={feature.id} withBorder radius="md" p="xs">
          <Stack gap={4}>
            <Text size="sm" fw={600}>{feature.subclass ? `${feature.name} · подкласс` : feature.name}</Text>
            <Text size="sm" c="dimmed">{feature.text}</Text>
            <Button size="xs" variant={featureButtonVariant(feature, props.sheet.conditions)} onClick={() => applyFeature({ characterId: props.sheet.id, featureId: feature.id })}>
              {featureLabel(feature, props.sheet.conditions)}
            </Button>
          </Stack>
        </Paper>
      ))}
      <Divider label="Заклинания" labelPosition="left" />
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600}>Список</Text>
        <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => setOpen(true)}>
          Добавить
        </Button>
      </Group>
      {props.sheet.spells.length === 0 && <Text size="sm" c="dimmed">Пусто</Text>}
      {props.sheet.spells.map(spell => (
        <SpellCard
          key={spell.id}
          spell={spell}
          catalog={catalog}
          onCast={() => cast({ characterId: props.sheet.id, spellId: spell.id })}
          onRemove={() => replace(props.sheet.spells.filter(item => item.id !== spell.id))}
        />
      ))}
      <AddSpellModal
        opened={open}
        catalog={catalog}
        known={props.sheet.spells}
        classId={props.sheet.classId}
        onClose={() => setOpen(false)}
        onAdd={(spell) => {
          replace([...props.sheet.spells, spell])
          setOpen(false)
        }}
      />
      {message ? <Text size="xs" c="red">{message}</Text> : null}
    </Stack>
  )
}

function SpellCard(props: {
  spell: KnownSpell
  catalog: SrdEntryDto[]
  onCast: () => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const text = props.spell.text ?? ''
  return (
    <Paper withBorder radius="md" p="xs">
      <Group align="flex-start" wrap="nowrap" gap="xs">
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600}>{spellTitle(props.spell)}</Text>
          {text
            ? (
                <>
                  <Text size="xs" c="dimmed" lineClamp={open ? undefined : 2}>{text}</Text>
                  {text.length > 120 && (
                    <Button size="compact-xs" variant="subtle" onClick={() => setOpen(current => !current)}>
                      {open ? 'Свернуть' : 'Текст'}
                    </Button>
                  )}
                </>
              )
            : null}
        </Stack>
        <Button size="xs" variant="light" onClick={props.onCast}>
          {rollsDice(props.spell, props.catalog) ? 'Бросить' : 'Ячейка'}
        </Button>
        <ActionIcon size="input-xs" variant="subtle" aria-label="Убрать заклинание" onClick={props.onRemove}>
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
    </Paper>
  )
}

function AddSpellModal(props: {
  opened: boolean
  catalog: SrdEntryDto[]
  known: KnownSpell[]
  classId: string
  onClose: () => void
  onAdd: (spell: KnownSpell) => void
}) {
  const classKey = props.classId.replace(/^class-/, '')
  const unused = props.catalog.filter(entry => !props.known.some(spell => spell.id === entry.id))
  const classSpells = unused.filter(entry => spellClasses(entry).includes(classKey))
  const hasClass = classSpells.length > 0
  const [onlyClass, setOnlyClass] = useState(hasClass)
  const source = onlyClass && hasClass ? classSpells : unused
  return (
    <Modal opened={props.opened} onClose={props.onClose} title="Добавить заклинание" centered size="lg">
      <Stack gap="sm">
        {hasClass && (
          <Group gap="xs">
            <Button size="xs" variant={onlyClass ? 'filled' : 'light'} onClick={() => setOnlyClass(true)}>Мой класс</Button>
            <Button size="xs" variant={onlyClass ? 'light' : 'filled'} onClick={() => setOnlyClass(false)}>Все</Button>
          </Group>
        )}
        <Select
          size="xs"
          searchable
          aria-label="Заклинание из справочника"
          placeholder="Название или круг"
          nothingFoundMessage="Нет такого заклинания"
          data={groupedSpells(source)}
          value={null}
          onChange={(value) => {
            const entry = props.catalog.find(item => item.id === value)
            if (!entry)
              return
            props.onAdd(knownFromCatalog(entry))
          }}
        />
        <Divider label="или своё" labelPosition="center" />
        <CustomSpell onAdd={props.onAdd} />
      </Stack>
    </Modal>
  )
}

function CustomSpell(props: { onAdd: (spell: KnownSpell) => void }) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState(0)
  const [dice, setDice] = useState('')
  const ready = name.trim().length > 0
  return (
    <Stack gap="xs">
      <Group gap="xs" align="flex-end">
        <TextInput size="xs" w={180} aria-label="Название заклинания" placeholder="Название" value={name} onChange={event => setName(event.currentTarget.value)} />
        <NumberInput size="xs" w={80} label="Круг" min={0} max={9} allowDecimal={false} value={level} onChange={value => setLevel(readLevel(value))} />
        <TextInput size="xs" w={90} aria-label="Кости" placeholder="2d8" value={dice} onChange={event => setDice(event.currentTarget.value)} />
        <Button
          size="xs"
          variant="light"
          disabled={!ready}
          onClick={() => {
            props.onAdd(customSpell(name, level, dice))
            setName('')
            setDice('')
          }}
        >
          Добавить
        </Button>
      </Group>
    </Stack>
  )
}

function groupedSpells(catalog: SrdEntryDto[]) {
  const byLevel = new Map<number, { value: string, label: string }[]>()
  for (const entry of catalog) {
    const level = Number(entry.body.level ?? 0)
    const list = byLevel.get(level) ?? []
    list.push({ value: entry.id, label: catalogLabel(entry) })
    byLevel.set(level, list)
  }
  return [...byLevel.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([level, items]) => ({
      group: level > 0 ? `${level} круг` : 'Заговоры',
      items,
    }))
}

function spellClasses(entry: SrdEntryDto) {
  const list = entry.body.classes
  if (!Array.isArray(list))
    return []
  return list.filter((item): item is string => typeof item === 'string')
}

function knownFromCatalog(entry: SrdEntryDto): KnownSpell {
  const level = Number(entry.body.level ?? 0)
  const dice = typeof entry.body.dice === 'string' ? entry.body.dice : ''
  const text = typeof entry.body.text === 'string' ? entry.body.text : ''
  return {
    id: entry.id,
    name: entry.name,
    level: Number.isFinite(level) ? Math.min(9, Math.max(0, Math.trunc(level))) : 0,
    ...(dice ? { dice } : {}),
    ...(text ? { text } : {}),
  }
}

function customSpell(name: string, level: number, dice: string): KnownSpell {
  const rolled = dice.trim()
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    level,
    ...(rolled ? { dice: rolled } : {}),
  }
}

function rollsDice(spell: KnownSpell, catalog: SrdEntryDto[]) {
  if (spell.dice?.includes('d'))
    return true
  const entry = catalog.find(item => item.id === spell.id)
  return typeof entry?.body.dice === 'string' && entry.body.dice.includes('d')
}

function catalogLabel(entry: SrdEntryDto) {
  const school = typeof entry.body.school === 'string' ? entry.body.school : ''
  return school ? `${entry.name} · ${school}` : entry.name
}

function spellTitle(spell: KnownSpell) {
  return spell.level > 0 ? `${spell.name} · ${spell.level} круг` : `${spell.name} · заговор`
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

function readLevel(value: string | number) {
  const next = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(next))
    return 0
  return Math.min(9, Math.max(0, Math.trunc(next)))
}
