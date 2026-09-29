import type { AttackDef, SrdEntryDto, TokenDto } from '@dnd/shared'
import { readArmorClass } from '@dnd/shared'
import { ActionIcon, Avatar, Button, Collapse, FileButton, Group, NumberInput, Stack, Text, TextInput } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { readAttacks } from './attacks'
import { tokenImageChosen, tokenStatsSaved } from './model'

interface MonsterDraft {
  name: string
  ac: number
  speed: number
  hpMax: number
  attacks: AttackDef[]
}

export function MonsterEdit(props: { token: TokenDto, monster: SrdEntryDto | null }) {
  const { save, chooseImage } = useUnit({
    save: tokenStatsSaved,
    chooseImage: tokenImageChosen,
  })
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => draftOf(props.token, props.monster))
  const [sourceId, setSourceId] = useState(props.token.id)
  if (sourceId !== props.token.id) {
    setSourceId(props.token.id)
    setDraft(draftOf(props.token, props.monster))
  }
  const token = props.token
  return (
    <Stack gap={6}>
      <Group gap="xs">
        <Avatar src={token.imageUrl ?? undefined} alt="" size="sm" radius="xl" />
        <Button size="xs" variant="subtle" onClick={() => setOpen(value => !value)}>{open ? 'Скрыть статы' : 'Статы'}</Button>
        <FileButton
          accept="image/*"
          onChange={(file) => {
            if (file)
              chooseImage({ tokenId: token.id, file })
          }}
        >
          {buttonProps => <Button {...buttonProps} size="xs" variant="default">Фото</Button>}
        </FileButton>
      </Group>
      <Collapse expanded={open}>
        <Stack gap={6}>
          <TextInput size="xs" label="Имя" value={draft.name} onChange={event => setDraft({ ...draft, name: event.currentTarget.value })} />
          <Group grow>
            <NumberInput size="xs" label="КД" min={0} max={40} allowDecimal={false} value={draft.ac} onChange={value => setDraft({ ...draft, ac: readInt(value, draft.ac) })} />
            <NumberInput size="xs" label="Хиты" min={1} max={999} allowDecimal={false} value={draft.hpMax} onChange={value => setDraft({ ...draft, hpMax: readInt(value, draft.hpMax) })} />
            <NumberInput size="xs" label="Скорость" min={0} max={200} allowDecimal={false} value={draft.speed} onChange={value => setDraft({ ...draft, speed: readInt(value, draft.speed) })} />
          </Group>
          {draft.attacks.map(attack => (
            <Stack key={attack.id} gap={4}>
              <Group gap="xs" wrap="nowrap">
                <TextInput
                  size="xs"
                  aria-label="Название атаки"
                  value={attack.name}
                  style={{ flex: 1 }}
                  onChange={event => patchAttack(setDraft, attack.id, { name: event.currentTarget.value })}
                />
                <ActionIcon size="sm" variant="subtle" aria-label="Убрать атаку" onClick={() => setDraft(current => ({ ...current, attacks: current.attacks.filter(item => item.id !== attack.id) }))}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
              <Group grow>
                <NumberInput size="xs" aria-label="Бонус атаки" min={-10} max={20} allowDecimal={false} value={attack.attackBonus} onChange={value => patchAttack(setDraft, attack.id, { attackBonus: readInt(value, attack.attackBonus) })} />
                <TextInput size="xs" aria-label="Кости урона" value={attack.damageDice} onChange={event => patchAttack(setDraft, attack.id, { damageDice: event.currentTarget.value })} />
                <NumberInput size="xs" aria-label="Бонус урона" min={-10} max={30} allowDecimal={false} value={attack.damageBonus} onChange={value => patchAttack(setDraft, attack.id, { damageBonus: readInt(value, attack.damageBonus) })} />
                <TextInput size="xs" aria-label="Тип урона" value={attack.damageType} onChange={event => patchAttack(setDraft, attack.id, { damageType: event.currentTarget.value })} />
              </Group>
            </Stack>
          ))}
          <Group gap="xs">
            <Button size="xs" variant="default" onClick={() => setDraft(current => ({ ...current, attacks: [...current.attacks, blankAttack()] }))}>Атака</Button>
            <Button
              size="xs"
              variant="light"
              disabled={draft.name.trim().length === 0 || draft.attacks.some(attack => attack.name.trim().length === 0 || attack.damageDice.trim().length === 0)}
              onClick={() => save({
                tokenId: token.id,
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
              })}
            >
              Сохранить
            </Button>
          </Group>
          <Text size="xs" c="dimmed">Хиты здесь — максимум. Текущие меняются кнопками урона.</Text>
        </Stack>
      </Collapse>
    </Stack>
  )
}

function draftOf(token: TokenDto, monster: SrdEntryDto | null) {
  const body = monster?.body
  const speed = typeof body?.speed === 'number' ? body.speed : 30
  const attacks = token.attacks.length > 0 ? token.attacks : readAttacks(body ?? {})
  return {
    name: token.name,
    ac: token.ac ?? readArmorClass(body) ?? 10,
    speed: token.speed ?? speed,
    hpMax: token.hpMax,
    attacks,
  }
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
