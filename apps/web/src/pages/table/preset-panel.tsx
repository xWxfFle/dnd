import type { Abilities, AttackDef } from '@dnd/shared'
import { abilities, abilityLabel } from '@dnd/shared'
import { ActionIcon, Button, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { presetRemoved, presets, presetSaved, presetSpawned } from './model'

const abilityOrder = abilities

interface DraftAttack {
  name: string
  attackBonus: number
  damageDice: string
  damageBonus: number
  damageType: string
}

const blankAbilities: Abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

export function PresetPanel(props: { sceneReady: boolean }) {
  const { list, save, remove, spawn } = useUnit({
    list: presets,
    save: presetSaved,
    remove: presetRemoved,
    spawn: presetSpawned,
  })
  const [name, setName] = useState('Свой монстр')
  const [ac, setAc] = useState(12)
  const [hp, setHp] = useState(10)
  const [speed, setSpeed] = useState(30)
  const [scores, setScores] = useState<Abilities>(blankAbilities)
  const [attack, setAttack] = useState<DraftAttack>({
    name: 'Атака',
    attackBonus: 4,
    damageDice: '1d6',
    damageBonus: 2,
    damageType: 'дробящий',
  })
  const [copies, setCopies] = useState(1)
  const ready = name.trim().length > 0 && attack.name.trim().length > 0 && attack.damageDice.trim().length > 0
  return (
    <Stack gap="xs">
      <Text size="xs" fw={700}>Свои монстры</Text>
      <Text size="xs" c="dimmed">Пресет живёт в кампании. С него можно ставить фишки на карту.</Text>
      <TextInput size="xs" label="Имя" value={name} onChange={event => setName(event.currentTarget.value)} />
      <Group gap="xs">
        <NumberInput size="xs" w={90} label="КД" min={0} max={40} allowDecimal={false} value={ac} onChange={value => setAc(readInt(value, ac))} />
        <NumberInput size="xs" w={90} label="Хиты" min={1} max={999} allowDecimal={false} value={hp} onChange={value => setHp(readInt(value, hp))} />
        <NumberInput size="xs" w={110} label="Скорость" min={0} max={200} allowDecimal={false} value={speed} onChange={value => setSpeed(readInt(value, speed))} />
      </Group>
      <Group gap="xs">
        {abilityOrder.map(ability => (
          <NumberInput
            key={ability}
            size="xs"
            w={72}
            label={abilityLabel[ability]}
            min={1}
            max={30}
            allowDecimal={false}
            value={scores[ability]}
            onChange={value => setScores(current => ({ ...current, [ability]: readInt(value, current[ability]) }))}
          />
        ))}
      </Group>
      <Group gap="xs" align="flex-end">
        <TextInput size="xs" w={140} label="Атака" value={attack.name} onChange={event => setAttack(current => ({ ...current, name: event.currentTarget.value }))} />
        <NumberInput size="xs" w={72} aria-label="Бонус атаки" min={-10} max={20} allowDecimal={false} value={attack.attackBonus} onChange={value => setAttack(current => ({ ...current, attackBonus: readInt(value, current.attackBonus) }))} />
        <TextInput size="xs" w={72} aria-label="Кости урона" value={attack.damageDice} onChange={event => setAttack(current => ({ ...current, damageDice: event.currentTarget.value }))} />
        <NumberInput size="xs" w={72} aria-label="Бонус урона" min={-10} max={30} allowDecimal={false} value={attack.damageBonus} onChange={value => setAttack(current => ({ ...current, damageBonus: readInt(value, current.damageBonus) }))} />
        <TextInput size="xs" w={110} aria-label="Тип урона" value={attack.damageType} onChange={event => setAttack(current => ({ ...current, damageType: event.currentTarget.value }))} />
      </Group>
      <Group gap="xs" align="flex-end">
        <NumberInput size="xs" w={90} label="Сколько" min={1} max={12} allowDecimal={false} value={copies} onChange={value => setCopies(readInt(value, copies))} />
        <Button
          size="xs"
          variant="light"
          disabled={!ready}
          onClick={() => save({
            name: name.trim(),
            ac,
            hp,
            speed,
            abilities: scores,
            attacks: [savedAttack(attack)],
          })}
        >
          Сохранить пресет
        </Button>
      </Group>
      {list.map(preset => (
        <Group key={preset.id} gap="xs" wrap="nowrap">
          <Text size="xs" style={{ flex: 1 }} truncate="end">{`${preset.name} · КД ${preset.ac} · ${preset.hp} хитов`}</Text>
          <Button size="compact-xs" variant="light" disabled={!props.sceneReady} onClick={() => spawn({ presetId: preset.id, copies })}>На карту</Button>
          <ActionIcon size="sm" variant="subtle" aria-label="Удалить пресет" onClick={() => remove(preset.id)}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
    </Stack>
  )
}

function savedAttack(attack: DraftAttack): AttackDef {
  return {
    id: crypto.randomUUID(),
    name: attack.name.trim(),
    attackBonus: attack.attackBonus,
    damageDice: attack.damageDice.trim(),
    damageBonus: attack.damageBonus,
    damageType: attack.damageType.trim(),
  }
}

function readInt(value: string | number, fallback: number) {
  const next = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(next) ? Math.trunc(next) : fallback
}
