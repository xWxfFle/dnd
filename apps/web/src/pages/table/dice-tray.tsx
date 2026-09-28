import { diceSides } from '@dnd/shared'
import { Button, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core'
import { useUnit } from '@virentia/react'
import { liveSnapshot } from '@/pages/table/live'
import { bonusChanged, checkRolled, diceError, diceFormula, diceReset, diceRollRequested, dieAdded, formulaChanged, parsedDice } from './model'

export function DiceTray() {
  const { rolls, formula, error, parsed, changeFormula, addDie, changeBonus, roll, reset, rollCheck } = useUnit({
    rolls: liveSnapshot,
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
      <TextInput
        mt="xs"
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
        <Button size="xs" onClick={() => void roll()}>Бросить</Button>
        <Button size="xs" variant="default" onClick={() => void reset()}>Сброс</Button>
      </Group>
      <Group gap="xs">
        <Button size="xs" variant="light" onClick={() => rollCheck('advantage')}>Преимущество</Button>
        <Button size="xs" variant="default" onClick={() => rollCheck('disadvantage')}>Помеха</Button>
      </Group>
      <Stack gap={6}>
        {(rolls?.rolls ?? []).slice(-8).map(item => (
          <Text key={item.id} size="sm">
            {`${item.displayName}: ${item.label} ${item.rolls.join(', ')} = ${item.total}`}
          </Text>
        ))}
      </Stack>
    </Stack>
  )
}
