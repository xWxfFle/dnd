import { diceSides } from '@dnd/shared'
import { Button, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core'
import { useUnit } from '@virentia/react'
import { liveSnapshot } from '@/pages/table/live'
import { bonusChanged, checkRolled, diceError, diceFormula, diceReset, diceRollRequested, dieAdded, formulaChanged, parsedDice } from './model'

export function DiceTray() {
  const { formula, error, parsed, changeFormula, addDie, changeBonus, roll, reset, rollCheck } = useUnit({
    formula: diceFormula,
    error: diceError,
    parsed: parsedDice,
    changeFormula: formulaChanged,
    addDie: dieAdded,
    changeBonus: bonusChanged,
    roll: diceRollRequested,
    reset: diceReset,
    rollCheck: checkRolled,
  })
  const diceCount = parsed.dice.reduce((sum, term) => sum + term.count, 0)
  return (
    <Stack gap="sm">
      <Group gap="xs" align="flex-end" wrap="nowrap">
        <TextInput
          style={{ flex: 1 }}
          size="xs"
          aria-label="Формула броска"
          placeholder="2d6+3"
          value={formula}
          onChange={event => changeFormula(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter')
              roll()
          }}
        />
        <Button size="xs" onClick={() => void roll()}>Бросить</Button>
      </Group>
      {error ? <Text size="xs" c="red">{error}</Text> : null}
      <Group gap="xs">
        {diceSides.map(sides => (
          <Button key={sides} size="compact-xs" variant="default" disabled={diceCount >= 40} onClick={() => addDie(sides)}>
            {`d${sides}`}
          </Button>
        ))}
      </Group>
      <Group align="flex-end" gap="xs">
        <NumberInput
          size="xs"
          w={120}
          label="Модификатор"
          allowDecimal={false}
          clampBehavior="strict"
          min={-100}
          max={100}
          value={parsed.dice.length === 0 ? 0 : parsed.bonus}
          onChange={changeBonus}
          disabled={parsed.dice.length === 0}
        />
        <Button size="xs" variant="default" onClick={() => void reset()}>Сброс</Button>
      </Group>
      <Group gap="xs">
        <Button size="xs" variant="light" onClick={() => rollCheck('advantage')}>Преимущество</Button>
        <Button size="xs" variant="default" onClick={() => rollCheck('disadvantage')}>Помеха</Button>
      </Group>
    </Stack>
  )
}

export function DiceLog() {
  const rolls = useUnit(liveSnapshot)
  const recent = (rolls?.rolls ?? []).slice(0, 4)
  if (recent.length === 0)
    return <Text size="xs" c="dimmed">Бросков пока нет</Text>
  return (
    <Stack gap={4}>
      {recent.map(item => (
        <Text key={item.id} size="xs">
          {`${item.displayName}: ${item.label} ${item.rolls.join(', ')} = ${item.total}`}
        </Text>
      ))}
    </Stack>
  )
}
