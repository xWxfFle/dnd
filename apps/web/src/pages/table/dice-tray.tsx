import type { DiceRollDto } from '@dnd/shared'
import { diceSides, formatDiceFormula, parseDice, readDiceFormula } from '@dnd/shared'
import { Button, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core'
import { useState } from 'react'
import { sendLive } from '@/pages/table/live'

export function DiceTray(props: { rolls: DiceRollDto[] }) {
  const [formula, setFormula] = useState('1d20')
  const [error, setError] = useState('')
  const parsed = parseDice(formula)
  const diceCount = parsed.dice.reduce((sum, term) => sum + term.count, 0)

  function addDie(sides: number) {
    if (diceCount >= 40)
      return
    const existing = parsed.dice.find(term => term.sign === 1 && term.sides === sides)
    const dice = existing
      ? parsed.dice.map(term => term === existing ? { ...term, count: term.count + 1 } : term)
      : [...parsed.dice, { count: 1, sides, sign: 1 as const }]
    setFormula(formatDiceFormula(dice, parsed.bonus))
    setError('')
  }

  function setBonus(value: string | number) {
    const next = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(next) || parsed.dice.length === 0)
      return
    const bonus = Math.max(-100, Math.min(100, Math.trunc(next)))
    setFormula(formatDiceFormula(parsed.dice, bonus))
    setError('')
  }

  function roll() {
    const read = readDiceFormula(formula)
    if (!read) {
      setError('Формула вроде 2d6+1d8+3')
      return
    }
    setError('')
    setFormula(read.formula)
    sendLive({ type: 'roll', label: read.formula, formula: read.formula, mode: 'normal' })
  }

  return (
    <Stack gap="sm">
      <TextInput
        mt="xs"
        size="xs"
        aria-label="Формула броска"
        placeholder="2d6+3"
        value={formula}
        onChange={event => setFormula(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter')
            roll()
        }}
      />
      {error ? <Text size="xs" c="red">{error}</Text> : null}
      <Group gap="xs">
        {diceSides.map(sides => (
          <Button key={sides} size="compact-xs" variant="default" onClick={() => addDie(sides)}>
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
          onChange={setBonus}
          disabled={parsed.dice.length === 0}
        />
        <Button size="xs" onClick={roll}>Бросить</Button>
        <Button
          size="xs"
          variant="default"
          onClick={() => {
            setFormula('')
            setError('')
          }}
        >
          Сброс
        </Button>
      </Group>
      <Group gap="xs">
        <Button size="xs" variant="light" onClick={() => sendLive({ type: 'roll', label: 'Преимущество', formula: '1d20', mode: 'advantage' })}>Преимущество</Button>
        <Button size="xs" variant="default" onClick={() => sendLive({ type: 'roll', label: 'Помеха', formula: '1d20', mode: 'disadvantage' })}>Помеха</Button>
      </Group>
      <Stack gap={6}>
        {props.rolls.slice(-8).map(item => (
          <Text key={item.id} size="sm">
            {`${item.displayName}: ${item.label} ${item.rolls.join(', ')} = ${item.total}`}
          </Text>
        ))}
      </Stack>
    </Stack>
  )
}
