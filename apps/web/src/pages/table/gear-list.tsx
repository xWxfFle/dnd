import type { CharacterDto, GearAbility, InventoryItem, ItemKind, SrdEntryDto } from '@dnd/shared'
import { readGearBody } from '@dnd/shared'
import { ActionIcon, Badge, Button, Divider, Group, Modal, NumberInput, Paper, Select, Stack, Text, TextInput } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { srdKitQuery } from '@/shared/api'
import { gearReplaced } from './model'

const kindLabel = {
  weapon: 'Оружие',
  armor: 'Броня',
  shield: 'Щит',
  gear: 'Вещь',
} as const satisfies Record<ItemKind, string>

const kindOptions = (Object.keys(kindLabel) as ItemKind[]).map(kind => ({ value: kind, label: kindLabel[kind] }))

const abilityLabel = {
  str: 'Сила',
  dex: 'Ловкость',
  finesse: 'Фехтовальное',
} as const satisfies Record<GearAbility, string>

const abilityOptions = (Object.keys(abilityLabel) as GearAbility[]).map(ability => ({
  value: ability,
  label: abilityLabel[ability],
}))

function gearOptionsOf(entries: SrdEntryDto[]) {
  const catalogItems = entries.filter(entry => entry.kind === 'item')
  return [
    ...kindOptions.map(kind => ({
      group: kind.label,
      items: catalogItems.filter(entry => entry.body.magic !== true && readGearBody(entry.body)?.kind === kind.value),
    })),
    { group: 'Магические предметы', items: catalogItems.filter(entry => entry.body.magic === true) },
  ]
    .map(group => ({ group: group.group, items: group.items.map(entry => ({ value: entry.id, label: entry.name })) }))
    .filter(group => group.items.length > 0)
}

export function GearList(props: { sheet: CharacterDto }) {
  const replace = useUnit(gearReplaced)
  return (
    <GearEditor
      inventory={props.sheet.inventory}
      onChange={inventory => replace({ characterId: props.sheet.id, inventory })}
    />
  )
}

export function GearEditor(props: { inventory: InventoryItem[], onChange: (inventory: InventoryItem[]) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Stack gap="sm" w="100%">
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600}>Предметы</Text>
        <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => setOpen(true)}>
          Добавить
        </Button>
      </Group>
      {props.inventory.length === 0 && <Text size="sm" c="dimmed">Пусто</Text>}
      {props.inventory.map(item => (
        <GearRow
          key={item.id}
          item={item}
          onQuantity={quantity => props.onChange(props.inventory.map(entry => entry.id === item.id ? { ...entry, quantity } : entry))}
          onToggle={() => props.onChange(props.inventory.map(entry => entry.id === item.id ? { ...entry, equipped: !entry.equipped } : entry))}
          onRemove={() => props.onChange(props.inventory.filter(entry => entry.id !== item.id))}
        />
      ))}
      <AddGearModal
        opened={open}
        onClose={() => setOpen(false)}
        onAdd={(item) => {
          props.onChange([...props.inventory, item])
          setOpen(false)
        }}
      />
    </Stack>
  )
}

function GearRow(props: {
  item: InventoryItem
  onQuantity: (quantity: number) => void
  onToggle: () => void
  onRemove: () => void
}) {
  const item = props.item
  const detail = itemDetail(item)
  return (
    <Paper withBorder radius="md" p="xs">
      <Group justify="space-between" wrap="nowrap" gap="sm" align="center">
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={600} truncate="end">{item.name}</Text>
            <Badge size="xs" variant="light">{kindLabel[item.kind]}</Badge>
            {item.equipped && <Badge size="xs" variant="outline">надето</Badge>}
          </Group>
          {detail && <Text size="xs" c="dimmed">{detail}</Text>}
        </Stack>
        <Group gap="xs" wrap="nowrap" align="center">
          <NumberInput
            size="xs"
            w={56}
            hideControls
            aria-label="Количество"
            min={1}
            max={99}
            allowDecimal={false}
            value={item.quantity}
            onChange={value => props.onQuantity(readCount(value, item.quantity))}
          />
          {item.kind !== 'gear' && (
            <Button size="xs" variant={item.equipped ? 'light' : 'default'} onClick={props.onToggle}>
              {item.equipped ? 'Снять' : 'Надеть'}
            </Button>
          )}
          <ActionIcon size="input-xs" variant="subtle" aria-label="Убрать" onClick={props.onRemove}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  )
}

function AddGearModal(props: {
  opened: boolean
  onClose: () => void
  onAdd: (item: InventoryItem) => void
}) {
  const { entries } = useUnit({ entries: srdKitQuery.data })
  const catalog = entries ?? []
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ItemKind>('gear')
  const [dice, setDice] = useState('1d6')
  const [damageType, setDamageType] = useState('дробящий')
  const [ability, setAbility] = useState<GearAbility>('str')
  const [armorBase, setArmorBase] = useState(11)
  const [dexCap, setDexCap] = useState<number | ''>('')
  const ready = customReady(name, kind, dice, damageType, armorBase)
  const reset = () => {
    setName('')
    setKind('gear')
    setDice('1d6')
    setDamageType('дробящий')
    setAbility('str')
    setArmorBase(11)
    setDexCap('')
  }
  const close = () => {
    reset()
    props.onClose()
  }
  return (
    <Modal opened={props.opened} onClose={close} title="Добавить снаряжение" centered>
      <Stack gap="sm">
        <Select
          size="xs"
          searchable
          aria-label="Добавить предмет"
          placeholder="Из справочника"
          nothingFoundMessage="Нет такого предмета"
          data={gearOptionsOf(catalog)}
          value={null}
          onChange={(value) => {
            const entry = catalog.find(item => item.id === value)
            const stats = readGearBody(entry?.body)
            if (!entry || !stats)
              return
            props.onAdd({
              id: crypto.randomUUID(),
              itemId: entry.id,
              name: entry.name,
              quantity: 1,
              kind: stats.kind,
              equipped: false,
            })
            reset()
          }}
        />
        <Divider label="или своя вещь" labelPosition="center" />
        <Group gap="xs" align="flex-end">
          <TextInput size="xs" w={180} aria-label="Название вещи" placeholder="Название" value={name} onChange={event => setName(event.currentTarget.value)} />
          <Select size="xs" w={140} aria-label="Вид вещи" data={kindOptions} value={kind} onChange={value => setKind(readKind(value))} allowDeselect={false} />
        </Group>
        {kind === 'weapon' && (
          <Group gap="xs">
            <TextInput size="xs" w={80} aria-label="Кости урона" value={dice} onChange={event => setDice(event.currentTarget.value)} />
            <TextInput size="xs" w={120} aria-label="Тип урона" value={damageType} onChange={event => setDamageType(event.currentTarget.value)} />
            <Select size="xs" w={140} aria-label="Характеристика" data={abilityOptions} value={ability} onChange={value => setAbility(readAbility(value))} allowDeselect={false} />
          </Group>
        )}
        {kind === 'armor' && (
          <Group gap="xs">
            <NumberInput size="xs" w={90} label="База КД" min={1} max={30} allowDecimal={false} value={armorBase} onChange={value => setArmorBase(readCount(value, armorBase))} />
            <NumberInput size="xs" w={120} label="Предел Ловкости" min={0} max={10} allowDecimal={false} value={dexCap} onChange={value => setDexCap(value === '' ? '' : readCount(value, 0))} />
          </Group>
        )}
        <Button
          size="xs"
          variant="light"
          disabled={!ready}
          onClick={() => {
            props.onAdd(customItem(name, kind, dice, damageType, ability, armorBase, dexCap))
            reset()
          }}
        >
          Добавить свою
        </Button>
      </Stack>
    </Modal>
  )
}

function itemDetail(item: InventoryItem) {
  if (item.kind === 'weapon' && item.dice)
    return item.damageType ? `${item.dice} ${item.damageType}` : item.dice
  if (item.kind === 'armor' && item.armorBase != null) {
    if (item.dexCap == null)
      return `КД ${item.armorBase}`
    return `КД ${item.armorBase} · Ловк. ≤ ${item.dexCap}`
  }
  return null
}

function customReady(name: string, kind: ItemKind, dice: string, damageType: string, armorBase: number) {
  if (name.trim().length === 0)
    return false
  if (kind === 'weapon')
    return dice.trim().length > 0 && damageType.trim().length > 0
  if (kind === 'armor')
    return armorBase >= 1
  return true
}

function customItem(name: string, kind: ItemKind, dice: string, damageType: string, ability: GearAbility, armorBase: number, dexCap: number | ''): InventoryItem {
  const id = crypto.randomUUID()
  const item: InventoryItem = {
    id,
    itemId: `custom-${id}`,
    name: name.trim(),
    quantity: 1,
    kind,
    equipped: false,
  }
  if (kind === 'weapon')
    return { ...item, dice: dice.trim(), damageType: damageType.trim(), ability }
  if (kind === 'armor')
    return { ...item, armorBase, dexCap: dexCap === '' ? null : dexCap }
  return item
}

function readKind(value: string | null): ItemKind {
  return kindOptions.find(option => option.value === value)?.value ?? 'gear'
}

function readAbility(value: string | null): GearAbility {
  return abilityOptions.find(option => option.value === value)?.value ?? 'str'
}

function readCount(value: string | number, fallback: number) {
  const next = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(next) ? Math.trunc(next) : fallback
}
