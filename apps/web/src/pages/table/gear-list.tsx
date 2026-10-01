import type { CharacterDto, ItemKind } from '@dnd/shared'
import { srdCatalog } from '@dnd/shared'
import { ActionIcon, Button, Group, Select, Stack, Text } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { gearAdded, gearRemoved, gearToggled } from './model'

const kindLabel = {
  weapon: 'Оружие',
  armor: 'Броня',
  shield: 'Щит',
  gear: 'Вещь',
} as const satisfies Record<ItemKind, string>

const gearOptions = srdCatalog
  .filter(entry => entry.kind === 'item')
  .map(entry => ({ value: entry.id, label: entry.name }))

export function GearList(props: { sheet: CharacterDto }) {
  const { add, toggle, remove } = useUnit({
    add: gearAdded,
    toggle: gearToggled,
    remove: gearRemoved,
  })
  const sheet = props.sheet
  return (
    <Stack gap="xs" align="flex-start" w={420}>
      <Text size="xs">Снаряжение</Text>
      {sheet.inventory.map(item => (
        <Group key={item.id} gap="xs" wrap="nowrap">
          <Text size="sm" style={{ flex: 1 }}>{item.name}</Text>
          <Text size="xs" c="dimmed">{kindLabel[item.kind]}</Text>
          {item.kind !== 'gear' && (
            <Button size="compact-xs" variant={item.equipped ? 'light' : 'default'} onClick={() => toggle({ characterId: sheet.id, id: item.id })}>
              {item.equipped ? 'Снять' : 'Надеть'}
            </Button>
          )}
          {item.kind !== 'gear' && (
            <ActionIcon size="sm" variant="subtle" aria-label="Убрать" onClick={() => remove({ characterId: sheet.id, id: item.id })}>
              <IconTrash size={14} />
            </ActionIcon>
          )}
        </Group>
      ))}
      <Select
        w={280}
        size="xs"
        aria-label="Добавить предмет"
        placeholder="Добавить предмет"
        data={gearOptions}
        value={null}
        onChange={value => value && add({ characterId: sheet.id, itemId: value })}
      />
    </Stack>
  )
}
