import type { CharacterDto } from '@dnd/shared'
import type { SheetRollMode } from './model'
import { abilities, abilityLabel, abilityModifier, attackBonus, skillAbility, skillLabel, skills } from '@dnd/shared'
import { Button, Group, Stack, Text } from '@mantine/core'
import { useUnit } from '@virentia/react'
import { liveSnapshot } from './live'
import { sheetCheckRolled, sheetRollMode, sheetRollModeChosen, sheetRollModes } from './model'

const rollModeLabel = {
  normal: 'Обычно',
  advantage: 'Преимущество',
  disadvantage: 'Помеха',
} as const satisfies Record<SheetRollMode, string>

export function RollModePicker() {
  const { mode, chooseMode } = useUnit({
    mode: sheetRollMode,
    chooseMode: sheetRollModeChosen,
  })
  return (
    <Group gap="xs">
      {sheetRollModes.map(item => (
        <Button key={item} size="xs" variant={mode === item ? 'filled' : 'default'} onClick={() => chooseMode(item)}>
          {rollModeLabel[item]}
        </Button>
      ))}
    </Group>
  )
}

export function SkillRolls(props: { sheet: CharacterDto }) {
  const { roll, snapshot } = useUnit({
    roll: sheetCheckRolled,
    snapshot: liveSnapshot,
  })
  const latest = snapshot?.rolls.at(-1)
  const sheet = props.sheet
  const exhaustion = sheet.exhaustion
  return (
    <Stack gap="sm">
      <RollModePicker />
      {latest && (
        <Text size="sm">{`${latest.displayName}: ${latest.label} ${latest.rolls.join(', ')} = ${latest.total}`}</Text>
      )}
      <Text size="xs">Проверки</Text>
      <Group gap="xs">
        {abilities.map(ability => (
          <Button
            key={ability}
            size="xs"
            variant="default"
            onClick={() => roll({
              label: abilityLabel[ability],
              bonus: abilityModifier(sheet.abilities[ability]),
              exhaustion,
            })}
          >
            {`${abilityLabel[ability]} ${signed(abilityModifier(sheet.abilities[ability]))}`}
          </Button>
        ))}
      </Group>
      <Text size="xs">Навыки</Text>
      <Group gap="xs">
        {skills.map((skill) => {
          const bonus = attackBonus(sheet.abilities, skillAbility[skill], sheet.level, sheet.skillProficiencies.includes(skill))
          return (
            <Button
              key={skill}
              size="xs"
              variant={sheet.skillProficiencies.includes(skill) ? 'light' : 'default'}
              onClick={() => roll({ label: skillLabel[skill], bonus, exhaustion })}
            >
              {`${skillLabel[skill]} ${signed(bonus)}`}
            </Button>
          )
        })}
      </Group>
      <Text size="xs">Спасброски</Text>
      <Group gap="xs">
        {abilities.map((ability) => {
          const bonus = attackBonus(sheet.abilities, ability, sheet.level, sheet.saveProficiencies.includes(ability))
          const label = `Спас ${abilityLabel[ability]}`
          return (
            <Button
              key={ability}
              size="xs"
              variant={sheet.saveProficiencies.includes(ability) ? 'light' : 'default'}
              onClick={() => roll({ label, bonus, exhaustion })}
            >
              {`${label} ${signed(bonus)}`}
            </Button>
          )
        })}
      </Group>
    </Stack>
  )
}

function signed(bonus: number) {
  if (bonus > 0)
    return `+${bonus}`
  return String(bonus)
}
