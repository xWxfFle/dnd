import type { Abilities, Ability, AttackDef, InventoryItem, SaveOverrides, TokenDto } from '@dnd/shared'
import { abilities, abilityLabel, abilityModifier, gearByItemId, monsterEquipment, saveBonus } from '@dnd/shared'
import { ActionIcon, Avatar, Button, FileButton, Group, NumberInput, Paper, Stack, Tabs, Text, TextInput } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { HpAdjust, HpBar } from './combat-strip'
import { GearEditor } from './gear-list'
import { attackRolled, monsterCheckRolled, tokenHiddenToggled, tokenImageChosen, tokenRemoved, tokenStatsSaved } from './model'
import { RollModePicker } from './skill-rolls'

const shortAbility = {
  str: 'Сил',
  dex: 'Лов',
  con: 'Тел',
  int: 'Инт',
  wis: 'Мдр',
  cha: 'Хар',
} as const satisfies Record<Ability, string>

interface MonsterDraft {
  name: string
  ac: number
  bareAc: number
  speed: number
  hpMax: number
  attacks: AttackDef[]
  abilities: Abilities | null
  saves: SaveOverrides
  inventory: InventoryItem[]
}

export function MonsterEdit(props: { token: TokenDto }) {
  const { save, chooseImage, toggleHidden, remove } = useUnit({
    save: tokenStatsSaved,
    chooseImage: tokenImageChosen,
    toggleHidden: tokenHiddenToggled,
    remove: tokenRemoved,
  })
  const [draft, setDraft] = useState(() => draftOf(props.token))
  const [sourceId, setSourceId] = useState(props.token.id)
  if (sourceId !== props.token.id) {
    setSourceId(props.token.id)
    setDraft(draftOf(props.token))
  }
  const token = props.token
  const ready = draft.name.trim().length > 0 && draft.attacks.every(attack => attack.name.trim().length > 0 && attack.damageDice.trim().length > 0)
  return (
    <Stack gap="sm" align="flex-start" w="100%">
      <Tabs defaultValue="overview" w="100%">
        <Tabs.List grow>
          <Tabs.Tab value="overview">Обзор</Tabs.Tab>
          <Tabs.Tab value="checks">Проверки</Tabs.Tab>
          <Tabs.Tab value="attacks">Атаки</Tabs.Tab>
          <Tabs.Tab value="gear">Снаряжение</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview" pt="sm">
          <Stack gap="sm" align="flex-start">
            <Group gap="sm" wrap="nowrap" align="flex-end">
              <Avatar src={token.imageUrl ?? undefined} alt="" size="lg" radius="xl" />
              <TextInput
                w={280}
                label="Имя"
                value={draft.name}
                onChange={event => setDraft({ ...draft, name: event.currentTarget.value })}
              />
            </Group>
            <Group gap="sm" align="flex-end">
              <NumberInput w={110} label="КД" min={0} max={40} allowDecimal={false} value={draft.ac} onChange={value => setDraft(current => setAc(current, readInt(value, current.ac)))} />
              <NumberInput w={110} label="Хиты" min={1} max={999} allowDecimal={false} value={draft.hpMax} onChange={value => setDraft({ ...draft, hpMax: readInt(value, draft.hpMax) })} />
              <NumberInput w={110} label="Скорость" min={0} max={200} allowDecimal={false} value={draft.speed} onChange={value => setDraft({ ...draft, speed: readInt(value, draft.speed) })} />
            </Group>
            <Stack gap={4} w={360}>
              <HpBar current={token.hpCurrent} max={token.hpMax} />
              <HpAdjust tokenId={token.id} />
            </Stack>
            <Text size="xs" c="dimmed">Хиты в полях — максимум. Текущие меняются кнопками рядом с полоской.</Text>
            <Group gap="xs">
              <FileButton
                accept="image/*"
                onChange={(file) => {
                  if (file)
                    chooseImage({ tokenId: token.id, file })
                }}
              >
                {buttonProps => <Button {...buttonProps} size="xs" variant="default">Портрет</Button>}
              </FileButton>
              <Button size="xs" variant="light" onClick={() => toggleHidden(token.id)}>{token.hidden ? 'Показать' : 'Скрыть'}</Button>
              <ActionIcon size="sm" variant="subtle" aria-label="Удалить фишку" onClick={() => remove(token.id)}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="checks" pt="sm">
          <MonsterChecks token={token} draft={draft} setDraft={setDraft} />
        </Tabs.Panel>
        <Tabs.Panel value="attacks" pt="sm">
          <Stack gap="sm">
            {draft.attacks.length === 0 && <Text size="sm" c="dimmed">Нет атак</Text>}
            {draft.attacks.map(attack => (
              <Paper key={attack.id} withBorder radius="md" p="sm">
                <MonsterAttack attack={attack} setDraft={setDraft} />
              </Paper>
            ))}
            <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => setDraft(current => ({ ...current, attacks: [...current.attacks, blankAttack()] }))}>
              Атака
            </Button>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="gear" pt="sm">
          <GearEditor inventory={draft.inventory} onChange={inventory => setDraft(current => wearGear(current, inventory))} />
        </Tabs.Panel>
      </Tabs>
      <Button size="xs" variant="light" disabled={!ready} onClick={() => save(savedBody(token.id, draft))}>Сохранить</Button>
    </Stack>
  )
}

function MonsterChecks(props: {
  token: TokenDto
  draft: MonsterDraft
  setDraft: (value: MonsterDraft | ((current: MonsterDraft) => MonsterDraft)) => void
}) {
  const roll = useUnit(monsterCheckRolled)
  const scores = props.token.abilities
  if (!props.draft.abilities && !scores)
    return null
  return (
    <Stack gap="sm" align="flex-start">
      <RollModePicker />
      {props.draft.abilities && (
        <Group gap="xs">
          {abilities.map(ability => (
            <NumberInput
              key={ability}
              size="xs"
              w={72}
              label={shortAbility[ability]}
              min={1}
              max={30}
              allowDecimal={false}
              value={props.draft.abilities?.[ability] ?? 10}
              onChange={value => setAbility(props.setDraft, ability, readInt(value, props.draft.abilities?.[ability] ?? 10))}
            />
          ))}
        </Group>
      )}
      {scores && (
        <Stack gap="xs">
          <Text size="xs">Проверки</Text>
          <Group gap="xs">
            {abilities.map((ability) => {
              const bonus = abilityModifier(scores[ability])
              return (
                <Button key={ability} size="xs" variant="default" onClick={() => roll({ tokenId: props.token.id, ability, kind: 'check' })}>
                  {`${abilityLabel[ability]} ${signed(bonus)}`}
                </Button>
              )
            })}
          </Group>
          <Text size="xs">Спасброски</Text>
          <Group gap="xs">
            {abilities.map((ability) => {
              const bonus = saveBonus(scores, props.token.saves ?? {}, ability)
              return (
                <Button key={ability} size="xs" variant="default" onClick={() => roll({ tokenId: props.token.id, ability, kind: 'save' })}>
                  {`Спас ${abilityLabel[ability]} ${signed(bonus)}`}
                </Button>
              )
            })}
          </Group>
        </Stack>
      )}
    </Stack>
  )
}

function MonsterAttack(props: {
  attack: AttackDef
  setDraft: (value: MonsterDraft | ((current: MonsterDraft) => MonsterDraft)) => void
}) {
  const roll = useUnit(attackRolled)
  const attack = props.attack
  const save = /сл\s*\d+/i.test(attack.damageType)
  return (
    <Stack gap="xs" align="flex-start">
      <Group gap="xs" wrap="nowrap">
        <TextInput
          size="xs"
          w={240}
          aria-label="Название атаки"
          value={attack.name}
          onChange={event => patchAttack(props.setDraft, attack.id, { name: event.currentTarget.value })}
        />
        <ActionIcon size="input-xs" variant="subtle" aria-label="Убрать атаку" onClick={() => props.setDraft(current => ({ ...current, attacks: current.attacks.filter(item => item.id !== attack.id) }))}>
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
      <Group gap="xs" align="flex-end">
        <NumberInput size="xs" w={72} aria-label="Бонус атаки" min={-10} max={20} allowDecimal={false} value={attack.attackBonus} onChange={value => patchAttack(props.setDraft, attack.id, { attackBonus: readInt(value, attack.attackBonus) })} />
        <TextInput size="xs" w={88} aria-label="Кости урона" value={attack.damageDice} onChange={event => patchAttack(props.setDraft, attack.id, { damageDice: event.currentTarget.value })} />
        <NumberInput size="xs" w={72} aria-label="Бонус урона" min={-10} max={30} allowDecimal={false} value={attack.damageBonus} onChange={value => patchAttack(props.setDraft, attack.id, { damageBonus: readInt(value, attack.damageBonus) })} />
        <TextInput size="xs" w={120} aria-label="Тип урона" value={attack.damageType} onChange={event => patchAttack(props.setDraft, attack.id, { damageType: event.currentTarget.value })} />
      </Group>
      <Button
        size="xs"
        variant="default"
        onClick={() => roll({ attack, kind: save ? 'save' : 'attack', exhaustion: 0 })}
      >
        {save ? 'Спасбросок' : 'Бросок'}
      </Button>
    </Stack>
  )
}

function savedBody(tokenId: string, draft: MonsterDraft) {
  return {
    tokenId,
    name: draft.name.trim(),
    hpMax: draft.hpMax,
    ac: draft.ac,
    speed: draft.speed,
    attacks: draft.attacks.map(attack => ({
      id: attack.id,
      name: attack.name.trim(),
      attackBonus: attack.attackBonus,
      damageDice: attack.damageDice.trim(),
      damageBonus: attack.damageBonus,
      damageType: attack.damageType.trim(),
    })),
    abilities: draft.abilities,
    saves: draft.abilities ? draft.saves : null,
    inventory: draft.inventory,
  }
}

function draftOf(token: TokenDto) {
  const ac = token.ac ?? 10
  const wornArmor = token.inventory.some(item => item.kind === 'armor' && item.equipped)
  const wornShield = token.inventory.some(item => item.kind === 'shield' && item.equipped)
  const dexBonus = token.abilities ? abilityModifier(token.abilities.dex) : 0
  const bareAc = wornArmor ? 10 + dexBonus : wornShield ? ac - 2 : ac
  return {
    name: token.name,
    ac,
    bareAc,
    speed: token.speed ?? 30,
    hpMax: token.hpMax,
    attacks: token.attacks,
    abilities: token.abilities,
    saves: token.saves ?? {},
    inventory: token.inventory,
  }
}

function setAc(draft: MonsterDraft, ac: number): MonsterDraft {
  const worn = draft.inventory.some(item => (item.kind === 'armor' || item.kind === 'shield') && item.equipped)
  return { ...draft, ac, bareAc: worn ? draft.bareAc : ac }
}

function wearGear(draft: MonsterDraft, inventory: InventoryItem[]): MonsterDraft {
  if (!draft.abilities)
    return { ...draft, inventory }
  const next = monsterEquipment({
    abilities: draft.abilities,
    baseAc: draft.bareAc,
    inventory,
    attacks: draft.attacks,
    gearOf: gearByItemId,
  })
  return { ...draft, inventory: next.inventory, ac: next.ac, attacks: next.attacks }
}

function signed(bonus: number) {
  if (bonus > 0)
    return `+${bonus}`
  return String(bonus)
}

function setAbility(setDraft: (value: MonsterDraft | ((current: MonsterDraft) => MonsterDraft)) => void, ability: Ability, score: number) {
  setDraft(current => wearGear({
    ...current,
    abilities: current.abilities ? { ...current.abilities, [ability]: score } : current.abilities,
  }, current.inventory))
}

function blankAttack(): AttackDef {
  return {
    id: crypto.randomUUID(),
    name: 'Атака',
    attackBonus: 4,
    damageDice: '1d6',
    damageBonus: 2,
    damageType: 'дробящий',
  }
}

function patchAttack(setDraft: (value: MonsterDraft | ((current: MonsterDraft) => MonsterDraft)) => void, id: string, patch: Partial<AttackDef>) {
  setDraft(current => ({
    ...current,
    attacks: current.attacks.map(attack => attack.id === id ? { ...attack, ...patch } : attack),
  }))
}

function readInt(value: string | number, fallback: number) {
  const next = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(next) ? Math.trunc(next) : fallback
}
