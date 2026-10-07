import type { Abilities, AttackDef } from '@dnd/shared'
import { abilities, abilityLabel, readArmorClass } from '@dnd/shared'
import { ActionIcon, Avatar, Button, FileButton, Group, Modal, NumberInput, Paper, Select, Stack, Tabs, Text, TextInput } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { srdMonstersQuery } from '@/shared/api'
import {
  blankMobPlaced,
  monsterId,
  monsterPlaceRequested,
  monsters,
  monsterSelected,
  presetRemoved,
  presets,
  presetSaved,
  presetSpawned,
  selectedMonster,
} from './model'

const abilityOrder = abilities

interface DraftAttack {
  name: string
  attackBonus: number
  damageDice: string
  damageBonus: number
  damageType: string
}

const blankAbilities: Abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

export function AddMobModal(props: { opened: boolean, onClose: () => void, sceneReady: boolean }) {
  const state = useUnit({
    catalog: monsters,
    pending: srdMonstersQuery.pending,
    pickedId: monsterId,
    pick: monsterSelected,
    monster: selectedMonster,
    placeCatalog: monsterPlaceRequested,
    placeBlank: blankMobPlaced,
    save: presetSaved,
  })
  const [name, setName] = useState('Свой монстр')
  const [ac, setAc] = useState(12)
  const [hp, setHp] = useState(10)
  const [speed, setSpeed] = useState(30)
  const [scores, setScores] = useState<Abilities>(blankAbilities)
  const [attack, setAttack] = useState<DraftAttack>({
    name: 'Атака',
    attackBonus: 4,
    damageDice: '1d6',
    damageBonus: 2,
    damageType: 'дробящий',
  })
  const [copies, setCopies] = useState(1)
  const [portrait, setPortrait] = useState<{ file: File, url: string } | null>(null)
  const ready = name.trim().length > 0 && attack.name.trim().length > 0 && attack.damageDice.trim().length > 0
  const catalogAc = state.monster ? readArmorClass(state.monster.body) : null
  const catalogHp = typeof state.monster?.body.hp === 'number' ? state.monster.body.hp : null
  const catalogSpeed = typeof state.monster?.body.speed === 'number' ? state.monster.body.speed : null
  const catalogCr = typeof state.monster?.body.cr === 'number' ? state.monster.body.cr : null
  const image = portrait?.file
  const pickImage = (file: File | null) => {
    if (portrait)
      URL.revokeObjectURL(portrait.url)
    setPortrait(file ? { file, url: URL.createObjectURL(file) } : null)
  }
  const close = () => {
    if (portrait)
      URL.revokeObjectURL(portrait.url)
    setPortrait(null)
    props.onClose()
  }
  return (
    <Modal opened={props.opened} onClose={close} title="Добавить моба" centered size="lg">
      <Stack gap="sm">
        <Group gap="sm" align="flex-end">
          <Avatar src={portrait?.url} alt="" size="lg" radius="xl" />
          <FileButton accept="image/*" onChange={pickImage}>
            {buttonProps => <Button {...buttonProps} size="xs" variant="default">Фото</Button>}
          </FileButton>
          {portrait && (
            <Button size="xs" variant="subtle" onClick={() => pickImage(null)}>Убрать</Button>
          )}
          <NumberInput size="xs" w={90} label="Сколько" min={1} max={12} allowDecimal={false} value={copies} onChange={value => setCopies(readInt(value, copies))} />
        </Group>
        <Text size="xs" c="dimmed">Фото копируется на все фишки этого штампа.</Text>
        <Tabs defaultValue="catalog">
          <Tabs.List grow>
            <Tabs.Tab value="catalog">Каталог</Tabs.Tab>
            <Tabs.Tab value="blank">Свой моб</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="catalog" pt="sm">
            <Stack gap="xs">
              <Select
                aria-label="Поиск монстра"
                placeholder="Поставить из каталога"
                searchable
                nothingFoundMessage={state.pending ? 'Загружаем…' : 'Нет такого монстра'}
                data={state.catalog.map(monster => ({
                  value: monster.id,
                  label: monsterPickLabel(monster.name, monster.body),
                }))}
                value={state.pickedId}
                onChange={value => value && state.pick(value)}
                allowDeselect={false}
              />
              {state.monster && <Text size="sm">{statLine(catalogAc, catalogHp, catalogSpeed, catalogCr)}</Text>}
              <Button
                size="xs"
                variant="light"
                disabled={!props.sceneReady || !state.monster}
                onClick={() => {
                  state.placeCatalog({ copies, image })
                  close()
                }}
              >
                На карту
              </Button>
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="blank" pt="sm">
            <Stack gap="xs">
              <TextInput size="xs" label="Имя" value={name} onChange={event => setName(event.currentTarget.value)} />
              <Group gap="xs">
                <NumberInput size="xs" w={90} label="КД" min={0} max={40} allowDecimal={false} value={ac} onChange={value => setAc(readInt(value, ac))} />
                <NumberInput size="xs" w={90} label="Хиты" min={1} max={999} allowDecimal={false} value={hp} onChange={value => setHp(readInt(value, hp))} />
                <NumberInput size="xs" w={110} label="Скорость" min={0} max={200} allowDecimal={false} value={speed} onChange={value => setSpeed(readInt(value, speed))} />
              </Group>
              <Group gap="xs">
                {abilityOrder.map(ability => (
                  <NumberInput
                    key={ability}
                    size="xs"
                    w={72}
                    label={abilityLabel[ability]}
                    min={1}
                    max={30}
                    allowDecimal={false}
                    value={scores[ability]}
                    onChange={value => setScores(current => ({ ...current, [ability]: readInt(value, current[ability]) }))}
                  />
                ))}
              </Group>
              <Group gap="xs" align="flex-end">
                <TextInput size="xs" w={140} label="Атака" value={attack.name} onChange={event => setAttack(current => ({ ...current, name: event.currentTarget.value }))} />
                <NumberInput size="xs" w={72} aria-label="Бонус атаки" min={-10} max={20} allowDecimal={false} value={attack.attackBonus} onChange={value => setAttack(current => ({ ...current, attackBonus: readInt(value, current.attackBonus) }))} />
                <TextInput size="xs" w={72} aria-label="Кости урона" value={attack.damageDice} onChange={event => setAttack(current => ({ ...current, damageDice: event.currentTarget.value }))} />
                <NumberInput size="xs" w={72} aria-label="Бонус урона" min={-10} max={30} allowDecimal={false} value={attack.damageBonus} onChange={value => setAttack(current => ({ ...current, damageBonus: readInt(value, current.damageBonus) }))} />
                <TextInput size="xs" w={110} aria-label="Тип урона" value={attack.damageType} onChange={event => setAttack(current => ({ ...current, damageType: event.currentTarget.value }))} />
              </Group>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  disabled={!ready || !props.sceneReady}
                  onClick={() => {
                    state.placeBlank({
                      name: name.trim(),
                      ac,
                      hp,
                      speed,
                      abilities: scores,
                      attacks: [savedAttack(attack)],
                      copies,
                      image,
                    })
                    close()
                  }}
                >
                  На карту
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  disabled={!ready}
                  onClick={() => saveTemplate(state.save, name, ac, hp, speed, scores, attack)}
                >
                  Сохранить шаблон
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Modal>
  )
}

export function TemplateList(props: { sceneReady: boolean }) {
  const { list, remove, spawn } = useUnit({
    list: presets,
    remove: presetRemoved,
    spawn: presetSpawned,
  })
  if (list.length === 0)
    return null
  return (
    <Stack gap="xs">
      <Text size="xs" fw={700}>Шаблоны</Text>
      {list.map(preset => (
        <Paper key={preset.id} withBorder radius="md" p="xs">
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" style={{ flex: 1 }} truncate="end">{`${preset.name} · КД ${preset.ac} · ${preset.hp} хитов`}</Text>
            <Button size="compact-xs" variant="light" disabled={!props.sceneReady} onClick={() => spawn({ presetId: preset.id, copies: 1 })}>На карту</Button>
            <ActionIcon size="sm" variant="subtle" aria-label="Удалить шаблон" onClick={() => remove(preset.id)}>
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Paper>
      ))}
    </Stack>
  )
}

function saveTemplate(
  save: (body: { name: string, ac: number, hp: number, speed: number, abilities: Abilities, attacks: AttackDef[] }) => void,
  name: string,
  ac: number,
  hp: number,
  speed: number,
  scores: Abilities,
  attack: DraftAttack,
) {
  save({
    name: name.trim(),
    ac,
    hp,
    speed,
    abilities: scores,
    attacks: [savedAttack(attack)],
  })
}

function savedAttack(attack: DraftAttack): AttackDef {
  return {
    id: crypto.randomUUID(),
    name: attack.name.trim(),
    attackBonus: attack.attackBonus,
    damageDice: attack.damageDice.trim(),
    damageBonus: attack.damageBonus,
    damageType: attack.damageType.trim(),
  }
}

function monsterPickLabel(name: string, body: Record<string, unknown>) {
  const cr = body.cr
  const hp = body.hp
  const parts = [name]
  if (typeof cr === 'number')
    parts.push(`КР ${formatCr(cr)}`)
  if (typeof hp === 'number')
    parts.push(`ХП ${hp}`)
  return parts.join(' · ')
}

function formatCr(cr: number) {
  const labelByCr: Record<number, string> = {
    0.125: '1/8',
    0.25: '1/4',
    0.5: '1/2',
  }
  return labelByCr[cr] ?? String(cr)
}

function statLine(ac: number | null, hp: number | null, speed: number | null, cr: number | null) {
  const parts = [
    cr == null ? '' : `КР ${formatCr(cr)}`,
    ac == null ? '' : `КД ${ac}`,
    hp == null ? '' : `${hp} хитов`,
    speed == null ? '' : `${speed} фт`,
  ].filter(part => part.length > 0)
  return parts.join(' · ')
}

function readInt(value: string | number, fallback: number) {
  const next = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(next) ? Math.trunc(next) : fallback
}
