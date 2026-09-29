import type { AttackDef } from '@dnd/shared'
import { Button, Group, Stack, Text } from '@mantine/core'
import { useUnit } from '@virentia/react'
import { attackRolled } from './model'

export function AttackRoll(props: {
  attack: AttackDef
  exhaustion?: number
  canStrike?: boolean
  onStrike?: () => void
}) {
  const roll = useUnit(attackRolled)
  const save = /сл\s*\d+/i.test(props.attack.damageType)
  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>{props.attack.name}</Text>
      <Group gap="xs">
        {props.onStrike && props.attack.attackBonus > 0 && (
          <Button size="xs" variant="filled" disabled={!props.canStrike} onClick={props.onStrike}>Ударить</Button>
        )}
        {save && (
          <Button size="xs" variant="default" onClick={() => roll({ attack: props.attack, kind: 'save', exhaustion: props.exhaustion ?? 0 })}>Спасбросок</Button>
        )}
      </Group>
    </Stack>
  )
}
