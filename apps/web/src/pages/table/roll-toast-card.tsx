import type { DiceRollDto } from '@dnd/shared'
import { Group, Paper, Stack, Text } from '@mantine/core'
import { IconDice } from '@tabler/icons-react'

const modeLabel = {
  normal: '',
  advantage: 'преимущество',
  disadvantage: 'помеха',
  crit: 'критический урон',
} as const satisfies Record<DiceRollDto['mode'], string>

const accentByNatural: Partial<Record<number, 'red' | 'yellow'>> = {
  1: 'red',
  20: 'yellow',
}

const naturalCaption: Partial<Record<number, string>> = {
  1: 'натуральная 1',
  20: 'натуральная 20',
}

export function RollToast(props: { roll: DiceRollDto, natural: number | null }) {
  const accent = props.natural == null ? null : accentByNatural[props.natural] ?? null
  const caption = props.natural == null ? '' : naturalCaption[props.natural] ?? ''
  const mode = modeLabel[props.roll.mode]
  return (
    <Paper
      shadow="md"
      radius="md"
      p="sm"
      withBorder
      w={300}
      style={accent
        ? {
            borderColor: `var(--mantine-color-${accent}-6)`,
            background: `var(--mantine-color-${accent}-light)`,
          }
        : undefined}
    >
      <Group justify="space-between" wrap="nowrap" align="center">
        <Stack gap={2}>
          <Group gap={6}>
            <IconDice size={16} />
            <Text size="xs" c="dimmed">{props.roll.displayName}</Text>
          </Group>
          <Text fw={600}>{props.roll.label}</Text>
          <DiceFaces roll={props.roll} natural={props.natural} />
          {mode ? <Text size="xs" c="dimmed">{mode}</Text> : null}
          {caption ? <Text size="xs" c={accent ?? undefined}>{caption}</Text> : null}
        </Stack>
        <Text fz={32} fw={700} lh={1} c={accent ?? undefined}>{props.roll.total}</Text>
      </Group>
    </Paper>
  )
}

function DiceFaces(props: { roll: DiceRollDto, natural: number | null }) {
  const { roll, natural } = props
  if (roll.rolls.length === 0)
    return null
  if (roll.rolls.length === 1 && roll.rolls[0] === roll.total)
    return null
  const seen = new Map<number, number>()
  return (
    <Group gap={6}>
      {roll.rolls.map((value) => {
        const count = seen.get(value) ?? 0
        seen.set(value, count + 1)
        const dropped = natural != null && roll.rolls.some(item => item !== natural) && value !== natural
        return (
          <Text key={`${value}-${count}`} size="xs" c={dropped ? 'dimmed' : undefined} td={dropped ? 'line-through' : undefined}>
            {value}
          </Text>
        )
      })}
    </Group>
  )
}
