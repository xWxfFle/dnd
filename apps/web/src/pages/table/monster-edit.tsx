import type { Abilities, Ability, AttackDef, InventoryItem, ItemKind, SaveOverrides, SrdEntryDto, TokenDto } from '@dnd/shared'
import { abilities, abilityLabel, abilityModifier, gearByItemId, monsterEquipment, readAbilities, readArmorClass, readSaveOverrides, saveBonus, srdCatalog } from '@dnd/shared'
import { ActionIcon, Avatar, Button, FileButton, Group, NumberInput, Select, Stack, Tabs, Text, TextInput } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { readAttacks } from './attacks'
import { HpAdjust, HpBar } from './combat-strip'
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

export function MonsterEdit(props: { token: TokenDto, monster: SrdEntryDto | null }) {
  const { save, chooseImage, toggleHidden, remove } = useUnit({
    save: tokenStatsSaved,
    chooseImage: tokenImageChosen,
    toggleHidden: tokenHiddenToggled,
    remove: tokenRemoved,
  })
  const [draft, setDraft] = useState(() => draftOf(props.token, props.monster))
  const [sourceId, setSourceId] = useState(props.token.id)
  if (sourceId !== props.token.id) {
    setSourceId(props.token.id)
    setDraft(draftOf(props.token, props.monster))
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
          <Group align="flex-start" gap="sm">
            {draft.attacks.map(attack => (
              <MonsterAttack key={attack.id} attack={attack} setDraft={setDraft} />
            ))}
            <Button size="xs" variant="default" onClick={() => setDraft(current => ({ ...current, attacks: [...current.attacks, blankAttack()] }))}>Атака</Button>
          </Group>
        </Tabs.Panel>
        <Tabs.Panel value="gear" pt="sm">
          <MonsterGear draft={draft} setDraft={setDraft} />
        </Tabs.Panel>
      </Tabs>
      <Button size="xs" variant="light" disabled={!ready} onClick={() => save(savedBody(token.id, draft))}>Сохранить</Button>
    </Stack>
  )
}

const gearKindLabel = {
  weapon: 'Оружие',
  armor: 'Броня',
  shield: 'Щит',
  gear: 'Вещь',
} as const satisfies Record<ItemKind, string>

const gearOptions = srdCatalog
  .filter(entry => entry.kind === 'item')
  .map(entry => ({ value: entry.id, label: entry.name }))

function MonsterGear(props: {
  draft: MonsterDraft
  setDraft: (value: MonsterDraft | ((current: MonsterDraft) => MonsterDraft)) => void
}) {
  return (
    <Stack gap="xs" align="flex-start" w={420}>
      {props.draft.inventory.map(item => (
        <Group key={item.id} gap="xs" wrap="nowrap">
          <Text size="sm" w={180} truncate="end">{item.name}</Text>
          <Text size="xs" c="dimmed" w={64}>{gearKindLabel[item.kind]}</Text>
          {item.kind !== 'gear' && (
            <Button size="compact-xs" variant={item.equipped ? 'light' : 'default'} onClick={() => props.setDraft(current => toggleGear(current, item.id))}>
              {item.equipped ? 'Снять' : 'Надеть'}
            </Button>
          )}
          <ActionIcon size="sm" variant="subtle" aria-label="Убрать" onClick={() => props.setDraft(current => wearGear(current, current.inventory.filter(entry => entry.id !== item.id)))}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      <Select
        w={280}
        size="xs"
        aria-label="Добавить предмет"
        placeholder="Добавить предмет"
        data={gearOptions}
        value={null}
        onChange={value => value && props.setDraft(current => addGear(current, value))}
      />
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
    <Stack gap={4} w={400} align="flex-start">
      <Group gap="xs" wrap="nowrap">
        <TextInput
          size="xs"
          w={240}
          aria-label="Название атаки"
          value={attack.name}
          onChange={event => patchAttack(props.setDraft, attack.id, { name: event.currentTarget.value })}
        />
        <ActionIcon size="sm" variant="subtle" aria-label="Убрать атаку" onClick={() => props.setDraft(current => ({ ...current, attacks: current.attacks.filter(item => item.id !== attack.id) }))}>
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

function draftOf(token: TokenDto, monster: SrdEntryDto | null) {
  const body = monster?.body
  const speed = typeof body?.speed === 'number' ? body.speed : 30
  const attacks = token.attacks.length > 0 ? token.attacks : readAttacks(body ?? {})
  const catalogAc = readArmorClass(body) ?? token.ac ?? 10
  const ac = token.ac ?? catalogAc
  const worn = token.inventory.some(item => (item.kind === 'armor' || item.kind === 'shield') && item.equipped)
  return {
    name: token.name,
    ac,
    bareAc: worn ? catalogAc : ac,
    speed: token.speed ?? speed,
    hpMax: token.hpMax,
    attacks,
    abilities: token.abilities ?? readAbilities(body?.abilities),
    saves: token.saves ?? readSaveOverrides(body?.saves),
    inventory: token.inventory,
  }
}

function setAc(draft: MonsterDraft, ac: number): MonsterDraft {
  const worn = draft.inventory.some(item => (item.kind === 'armor' || item.kind === 'shield') && item.equipped)
  return { ...draft, ac, bareAc: worn ? draft.bareAc : ac }
}

function addGear(draft: MonsterDraft, itemId: string): MonsterDraft {
  const gear = gearByItemId(itemId)
  if (!gear)
    return draft
  return wearGear(draft, [...draft.inventory, {
    id: crypto.randomUUID(),
    itemId,
    name: gear.name,
    quantity: 1,
    kind: gear.stats.kind,
    equipped: false,
  }])
}

function toggleGear(draft: MonsterDraft, id: string): MonsterDraft {
  const current = draft.inventory.find(item => item.id === id)
  if (!current || current.kind === 'gear')
    return draft
  return wearGear(draft, draft.inventory.map(item => item.id === id ? { ...item, equipped: !current.equipped } : item))
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
