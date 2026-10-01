import type { CharacterDto, CombatDto, SrdEntryDto, TokenDto } from '@dnd/shared'
import { isBloodied, readArmorClass } from '@dnd/shared'
import { ActionIcon, Button, Group, Progress, Select, Stack, Text } from '@mantine/core'
import { IconMinus, IconPlus } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { AttackRoll } from './attack-roll'
import { readAttacks } from './attacks'
import { combatAdvanced, combatEnded, combatStarted, dm, slotMarked, strikeDeclared, tokenHpChanged } from './model'

export function CombatStrip(props: {
  combat: CombatDto | null
  dm: boolean
  tokens: TokenDto[]
  monsters: SrdEntryDto[]
  characters: CharacterDto[]
  onFocus: (tokenId: string) => void
  onOpenSheet: (characterId: string) => void
  onOpenToken: (tokenId: string) => void
}) {
  const { start, next, end, markSlot, strike } = useUnit({
    start: combatStarted,
    next: combatAdvanced,
    end: combatEnded,
    markSlot: slotMarked,
    strike: strikeDeclared,
  })
  const [targetId, setTargetId] = useState<string | null>(null)
  const [aimedTurn, setAimedTurn] = useState<string | null>(null)
  const combat = props.combat
  const active = combat?.combatants[combat.activeIndex]
  const activeId = active?.id ?? null
  if (aimedTurn !== activeId) {
    setAimedTurn(activeId)
    setTargetId(null)
  }
  const actingToken = active?.tokenId ? props.tokens.find(item => item.id === active.tokenId) ?? null : null
  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap">
        <Text fw={700}>
          {combat ? `Раунд ${combat.round}${active ? ` · ${active.name}` : ''}` : 'Бой'}
        </Text>
        {props.dm && (
          <Group gap="xs" wrap="nowrap">
            {combat
              ? (
                  <>
                    <Button size="xs" onClick={() => void next()}>Дальше</Button>
                    <Button size="xs" variant="default" onClick={() => void end()}>Конец</Button>
                  </>
                )
              : <Button size="xs" onClick={() => void start()}>Начать</Button>}
          </Group>
        )}
      </Group>
      {!combat && <Text size="sm" c="dimmed">«Начать» бросает инициативу всем на карте</Text>}
      {combat && combat.combatants.length === 0 && <Text size="sm" c="dimmed">На карте никого</Text>}
      {active && actingToken && !actingToken.obscured && (
        <ActingTurn
          token={actingToken}
          tokens={props.tokens}
          monsters={props.monsters}
          characters={props.characters}
          targetId={targetId}
          onTarget={setTargetId}
          slotSpent={active.slotSpentThisTurn}
          onSlot={() => void markSlot()}
          onStrike={(attack, targetTokenId) => {
            if (active.tokenId)
              strike({ attack, attackerTokenId: active.tokenId, targetTokenId })
          }}
        />
      )}
      {combat?.combatants.map((combatant, index) => {
        const acting = index === combat.activeIndex
        const tokenId = combatant.tokenId
        const token = tokenId ? props.tokens.find(item => item.id === tokenId) ?? null : null
        return (
          <Stack key={combatant.id} gap={4}>
            <Button
              fullWidth
              size="xs"
              variant={acting ? 'light' : 'subtle'}
              onClick={() => openCombatant(props, tokenId, token)}
            >
              {`${combatant.initiative}. ${combatant.name}${combatant.hidden ? ' · скрыт' : ''}`}
            </Button>
            {!token?.obscured && <HpBar current={combatant.hpCurrent} max={combatant.hpMax} />}
            {acting && props.dm && tokenId && !token?.obscured && <HpAdjust tokenId={tokenId} />}
          </Stack>
        )
      })}
    </Stack>
  )
}

function openCombatant(
  props: { dm: boolean, onFocus: (tokenId: string) => void, onOpenSheet: (characterId: string) => void, onOpenToken: (tokenId: string) => void },
  tokenId: string | null,
  token: { characterId: string | null } | null,
) {
  if (!tokenId)
    return
  props.onFocus(tokenId)
  if (token?.characterId) {
    props.onOpenSheet(token.characterId)
    return
  }
  if (props.dm)
    props.onOpenToken(tokenId)
}

function ActingTurn(props: {
  token: TokenDto
  tokens: TokenDto[]
  monsters: SrdEntryDto[]
  characters: CharacterDto[]
  targetId: string | null
  onTarget: (tokenId: string | null) => void
  slotSpent: boolean
  onSlot: () => void
  onStrike: (attack: ReturnType<typeof attacksOf>[number], targetTokenId: string) => void
}) {
  const attacks = attacksOf(props.token, props.monsters, props.characters)
  return (
    <Stack gap={6}>
      <Text size="xs">{attacks.length > 0 ? 'Атаки этого хода' : 'У этой фишки нет атак'}</Text>
      {attacks.some(attack => attack.attackBonus > 0) && (
        <Select
          size="xs"
          aria-label="Кого атаковать"
          placeholder="Кого атаковать"
          data={targetsOf(props.token, props.tokens, props.monsters, props.characters)}
          value={props.targetId}
          onChange={props.onTarget}
        />
      )}
      {attacks.map(attack => (
        <AttackRoll
          key={attack.id}
          attack={attack}
          canStrike={Boolean(props.targetId)}
          onStrike={() => {
            if (props.targetId)
              props.onStrike(attack, props.targetId)
          }}
        />
      ))}
      <Button size="xs" variant="light" disabled={props.slotSpent} onClick={props.onSlot}>
        {props.slotSpent ? 'Ячейка за ход потрачена' : 'Ячейка за ход'}
      </Button>
    </Stack>
  )
}

export function HpAdjust(props: { tokenId: string }) {
  const { master, changeHp } = useUnit({
    master: dm,
    changeHp: tokenHpChanged,
  })
  if (!master)
    return null
  return (
    <Group gap={4}>
      <ActionIcon size="sm" variant="default" aria-label="Урон" onClick={() => changeHp({ tokenId: props.tokenId, delta: -1 })}>
        <IconMinus size={14} />
      </ActionIcon>
      <ActionIcon size="sm" variant="default" aria-label="Лечение" onClick={() => changeHp({ tokenId: props.tokenId, delta: 1 })}>
        <IconPlus size={14} />
      </ActionIcon>
    </Group>
  )
}

export function HpBar(props: { current: number, max: number, temp?: number }) {
  const value = props.max <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(props.current / props.max * 100)))
  return (
    <Stack gap={2}>
      <Group justify="space-between">
        <Text size="xs">{`Хиты ${props.current}/${props.max}`}</Text>
        {props.temp ? <Text size="xs">{`+${props.temp} временных`}</Text> : null}
      </Group>
      <Progress size="sm" value={value} color={hpColor(props.current, props.max)} aria-label="Хиты" />
    </Stack>
  )
}

function targetsOf(attacker: TokenDto, tokens: TokenDto[], monsters: SrdEntryDto[], characters: CharacterDto[]) {
  return tokens
    .filter(token => token.sceneId === attacker.sceneId && token.id !== attacker.id)
    .map(token => ({
      value: token.id,
      label: targetLabel(token.name, armorOf(token, monsters, characters)),
    }))
}

function armorOf(token: TokenDto, monsters: SrdEntryDto[], characters: CharacterDto[]) {
  if (token.characterId) {
    const character = characters.find(item => item.id === token.characterId)
    return character?.ac ?? null
  }
  if (token.ac != null)
    return token.ac
  const monster = monsters.find(item => item.id === token.monsterId) ?? monsters.find(item => item.name === token.name)
  return readArmorClass(monster?.body)
}

function targetLabel(name: string, ac: number | null) {
  return ac == null ? name : `${name} · КД ${ac}`
}

function attacksOf(token: TokenDto, monsters: SrdEntryDto[], characters: CharacterDto[]) {
  if (token.characterId) {
    const character = characters.find(item => item.id === token.characterId)
    return character?.attacks ?? []
  }
  if (token.attacks.length > 0)
    return token.attacks
  const monster = monsters.find(item => item.id === token.monsterId) ?? monsters.find(item => item.name === token.name)
  return monster ? readAttacks(monster.body) : []
}

function hpColor(current: number, max: number) {
  if (current <= 0)
    return 'red'
  if (isBloodied(current, max))
    return 'orange'
  return 'teal'
}
