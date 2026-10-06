import type { CharacterDto, CombatDto, TokenDto } from '@dnd/shared'
import { isBloodied } from '@dnd/shared'
import { ActionIcon, Avatar, Badge, Button, Group, NumberInput, Paper, Progress, Select, Stack, Text } from '@mantine/core'
import { IconMinus, IconPlus } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { AttackRoll } from './attack-roll'
import { combatAdvanced, combatEnded, combatStarted, dm, roster, sheetHpChanged, slotMarked, strikeDeclared, tokenHpChanged, viewerId } from './model'

export function CombatStrip(props: {
  combat: CombatDto | null
  dm: boolean
  tokens: TokenDto[]
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
        <Paper withBorder radius="md" p="sm">
          <ActingTurn
            token={actingToken}
            tokens={props.tokens}
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
        </Paper>
      )}
      {combat?.combatants.map((combatant, index) => {
        const tokenId = combatant.tokenId
        const token = tokenId ? props.tokens.find(item => item.id === tokenId) ?? null : null
        return (
          <CombatantCard
            key={combatant.id}
            combatant={combatant}
            token={token}
            acting={index === combat.activeIndex}
            dm={props.dm}
            characters={props.characters}
            onOpen={() => openCombatant(props, tokenId, token)}
          />
        )
      })}
    </Stack>
  )
}

function CombatantCard(props: {
  combatant: CombatDto['combatants'][number]
  token: TokenDto | null
  acting: boolean
  dm: boolean
  characters: CharacterDto[]
  onOpen: () => void
}) {
  const combatant = props.combatant
  const token = props.token
  const obscured = Boolean(token?.obscured)
  const dead = combatant.hpCurrent <= 0
  const ac = token && !obscured ? armorOf(token, props.characters) : null
  const speed = token && !obscured ? token.speed : null
  const openLabel = token?.characterId ? 'Лист' : 'Карточка'
  return (
    <Paper withBorder radius="md" p="sm" bg={props.acting ? 'dark.6' : undefined}>
      <Group align="flex-start" wrap="nowrap" gap="sm">
        <Avatar
          src={obscured ? null : token?.imageUrl}
          alt={combatant.name}
          name={combatant.name}
          color="gray"
          variant="light"
          size={56}
          radius="md"
        />
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text fw={700} c={dead ? 'red' : 'yellow.4'} truncate="end">
              {`${combatant.initiative}. ${combatant.name}`}
            </Text>
            <Group gap={4} wrap="nowrap">
              {props.acting && <Badge size="xs" variant="light">ход</Badge>}
              {combatant.hidden && <Badge size="xs" variant="outline">скрыт</Badge>}
            </Group>
          </Group>
          {!obscured && <HpBar current={combatant.hpCurrent} max={combatant.hpMax} />}
          {!obscured && (
            <Group gap="md">
              {ac != null && <Text size="xs">{`КД ${ac}`}</Text>}
              {speed != null && <Text size="xs">{`Скорость ${speed}`}</Text>}
            </Group>
          )}
          <Group justify="space-between" align="flex-end" wrap="nowrap">
            {!obscured && <HpAdjust tokenId={combatant.tokenId} characterId={token?.characterId ?? null} />}
            {(token?.characterId || props.dm) && (
              <Button size="xs" variant="light" onClick={props.onOpen}>{openLabel}</Button>
            )}
          </Group>
        </Stack>
      </Group>
    </Paper>
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
  characters: CharacterDto[]
  targetId: string | null
  onTarget: (tokenId: string | null) => void
  slotSpent: boolean
  onSlot: () => void
  onStrike: (attack: ReturnType<typeof attacksOf>[number], targetTokenId: string) => void
}) {
  const attacks = attacksOf(props.token, props.characters)
  return (
    <Stack gap={6}>
      <Text size="xs">{attacks.length > 0 ? 'Атаки этого хода' : 'У этой фишки нет атак'}</Text>
      {attacks.some(attack => attack.attackBonus > 0) && (
        <Select
          size="xs"
          aria-label="Кого атаковать"
          placeholder="Кого атаковать"
          data={targetsOf(props.token, props.tokens, props.characters)}
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

export function HpAdjust(props: { tokenId?: string | null, characterId?: string | null }) {
  const { master, viewer, people, changeToken, changeSheet } = useUnit({
    master: dm,
    viewer: viewerId,
    people: roster,
    changeToken: tokenHpChanged,
    changeSheet: sheetHpChanged,
  })
  const [amount, setAmount] = useState(1)
  const owner = props.characterId
    ? people.some(character => character.id === props.characterId && character.userId === viewer)
    : false
  const tokenPath = Boolean(master && props.tokenId)
  const sheetPath = Boolean(props.characterId && (master || owner))
  if (!tokenPath && !sheetPath)
    return null
  const step = Math.min(999, Math.max(1, amount || 1))
  const apply = (sign: number) => {
    const delta = sign * step
    if (tokenPath && props.tokenId) {
      changeToken({ tokenId: props.tokenId, delta })
      return
    }
    if (props.characterId)
      changeSheet({ characterId: props.characterId, delta })
  }
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">Снять / добавить</Text>
      <ActionIcon.Group>
        <ActionIcon variant="default" size="input-xs" aria-label="Снять хиты" onClick={() => apply(-1)}>
          <IconMinus size={14} />
        </ActionIcon>
        <ActionIcon.GroupSection variant="default" size="input-xs" bg="var(--mantine-color-body)" miw={56} px={4}>
          <NumberInput
            size="xs"
            variant="unstyled"
            hideControls
            allowDecimal={false}
            min={1}
            max={999}
            aria-label="Сколько хитов снять или добавить"
            value={amount}
            onChange={value => setAmount(readStep(value))}
            styles={{ input: { textAlign: 'center', minHeight: 'unset', height: '100%', padding: 0 } }}
          />
        </ActionIcon.GroupSection>
        <ActionIcon variant="default" size="input-xs" aria-label="Добавить хиты" onClick={() => apply(1)}>
          <IconPlus size={14} />
        </ActionIcon>
      </ActionIcon.Group>
    </Stack>
  )
}

function readStep(value: string | number) {
  const next = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(next))
    return 1
  return Math.min(999, Math.max(1, Math.trunc(next)))
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

function targetsOf(attacker: TokenDto, tokens: TokenDto[], characters: CharacterDto[]) {
  return tokens
    .filter(token => token.sceneId === attacker.sceneId && token.id !== attacker.id)
    .map(token => ({
      value: token.id,
      label: targetLabel(token.name, armorOf(token, characters)),
    }))
}

function armorOf(token: TokenDto, characters: CharacterDto[]) {
  if (token.characterId) {
    const character = characters.find(item => item.id === token.characterId)
    return character?.ac ?? null
  }
  return token.ac
}

function targetLabel(name: string, ac: number | null) {
  return ac == null ? name : `${name} · КД ${ac}`
}

function attacksOf(token: TokenDto, characters: CharacterDto[]) {
  if (token.characterId) {
    const character = characters.find(item => item.id === token.characterId)
    return character?.attacks ?? []
  }
  return token.attacks
}

function hpColor(current: number, max: number) {
  if (current <= 0)
    return 'red'
  if (isBloodied(current, max))
    return 'orange'
  return 'teal'
}
