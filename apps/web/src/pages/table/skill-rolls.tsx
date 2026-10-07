import type { CharacterDto } from '@dnd/shared'
import type { SheetRollMode } from './model'
import { abilities, abilityLabel, abilityModifier, attackBonus, skillAbility, skillLabel, skills } from '@dnd/shared'
import { Badge, Button, Checkbox, Group, Stack, Text } from '@mantine/core'
import { useUnit } from '@virentia/react'
import { liveSnapshot } from './live'
import { dm, sheetCheckRolled, sheetRollMode, sheetRollModeChosen, sheetRollModes, skillProficiencyToggled } from './model'

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

export function SkillRolls(props: { sheet: CharacterDto, canRoll: boolean }) {
  const { roll, snapshot, master, toggleSkill } = useUnit({
    roll: sheetCheckRolled,
    snapshot: liveSnapshot,
    master: dm,
    toggleSkill: skillProficiencyToggled,
  })
  const latest = snapshot?.rolls.at(-1)
  const sheet = props.sheet
  const exhaustion = sheet.exhaustion
  return (
    <Stack gap="sm">
      {props.canRoll && <RollModePicker />}
      {props.canRoll && latest && (
        <Text size="sm">{`${latest.displayName}: ${latest.label} ${latest.rolls.join(', ')} = ${latest.total}`}</Text>
      )}
      <Text size="xs">Проверки</Text>
      <Group gap="xs">
        {abilities.map((ability) => {
          const label = `${abilityLabel[ability]} ${signed(abilityModifier(sheet.abilities[ability]))}`
          if (!props.canRoll)
            return <Badge key={ability} size="sm" variant="outline">{label}</Badge>
          return (
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
              {label}
            </Button>
          )
        })}
      </Group>
      <Text size="xs">Владение</Text>
      {master && (
        <Stack gap={4}>
          <Text size="xs" c="dimmed">Владение — ставит мастер</Text>
          {skills.map(skill => (
            <Checkbox
              key={skill}
              size="xs"
              label={skillLabel[skill]}
              checked={sheet.skillProficiencies.includes(skill)}
              onChange={() => toggleSkill({ characterId: sheet.id, skill })}
            />
          ))}
        </Stack>
      )}
      <Group gap="xs">
        {skills.filter(skill => sheet.skillProficiencies.includes(skill)).map((skill) => {
          const bonus = attackBonus(sheet.abilities, skillAbility[skill], sheet.level, true)
          return (
            <SkillChip
              key={skill}
              label={`${skillLabel[skill]} ${signed(bonus)}`}
              canRoll={props.canRoll}
              proficient
              onRoll={() => roll({ label: skillLabel[skill], bonus, exhaustion })}
            />
          )
        })}
        {sheet.skillProficiencies.length === 0 && <Text size="xs" c="dimmed">Нет владений</Text>}
      </Group>
      <Text size="xs">Прочие навыки</Text>
      <Group gap="xs">
        {skills.filter(skill => !sheet.skillProficiencies.includes(skill)).map((skill) => {
          const bonus = attackBonus(sheet.abilities, skillAbility[skill], sheet.level, false)
          return (
            <SkillChip
              key={skill}
              label={`${skillLabel[skill]} ${signed(bonus)}`}
              canRoll={props.canRoll}
              proficient={false}
              onRoll={() => roll({ label: skillLabel[skill], bonus, exhaustion })}
            />
          )
        })}
      </Group>
      <Text size="xs">Спасброски</Text>
      <Group gap="xs">
        {abilities.map((ability) => {
          const proficient = sheet.saveProficiencies.includes(ability)
          const bonus = attackBonus(sheet.abilities, ability, sheet.level, proficient)
          return (
            <SkillChip
              key={ability}
              label={`Спас ${abilityLabel[ability]} ${signed(bonus)}`}
              canRoll={props.canRoll}
              proficient={proficient}
              onRoll={() => roll({ label: `Спас ${abilityLabel[ability]}`, bonus, exhaustion })}
            />
          )
        })}
      </Group>
    </Stack>
  )
}

function SkillChip(props: { label: string, canRoll: boolean, proficient: boolean, onRoll: () => void }) {
  if (!props.canRoll)
    return <Badge size="sm" variant={props.proficient ? 'light' : 'outline'}>{props.label}</Badge>
  return (
    <Button size="xs" variant={props.proficient ? 'light' : 'default'} onClick={props.onRoll}>
      {props.label}
    </Button>
  )
}

function signed(bonus: number) {
  if (bonus > 0)
    return `+${bonus}`
  return String(bonus)
}
