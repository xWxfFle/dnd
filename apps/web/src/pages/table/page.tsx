import type { AttackDef, CharacterDto, SrdEntryDto } from '@dnd/shared'
import { isBloodied, isDeadFromExhaustion, SRD_ATTRIBUTION } from '@dnd/shared'
import { ActionIcon, Avatar, Button, FileButton, Group, NumberInput, Paper, Select, Stack, Text, Textarea, TextInput, Title } from '@mantine/core'
import { IconMinus, IconPlus, IconTrash } from '@tabler/icons-react'
import { scoped } from '@virentia/core'
import { useQuery } from '@virentia/net-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { MapBoard } from '@/features/table-map/board'
import { ClassKit } from '@/pages/table/class-kit'
import { DiceTray } from '@/pages/table/dice-tray'
import { liveSnapshot, sendLive } from '@/pages/table/live'
import { apiFetch, srdQuery } from '@/shared/api'
import { characterRoute, homeRoute, tableRoute } from '@/shared/routing'
import { appScope, readUserId } from '@/shared/session'

const fieldPresets = [
  { label: '15×10', columns: 15, rows: 10, cellSize: 48 },
  { label: '20×14', columns: 20, rows: 14, cellSize: 48 },
  { label: '30×20', columns: 30, rows: 20, cellSize: 40 },
] as const

export function TablePage() {
  const snapshot = useUnit(liveSnapshot)
  const routeParams = useUnit(tableRoute.params)
  const srd = useQuery(srdQuery)
  const [notes, setNotes] = useState('')
  const [notesScene, setNotesScene] = useState<string | null>(null)
  const [monsterId, setMonsterId] = useState('monster-goblin-warrior')
  const [mapName, setMapName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [gridKey, setGridKey] = useState('')
  const [columns, setColumns] = useState(20)
  const [rows, setRows] = useState(14)
  const [cellSize, setCellSize] = useState(48)
  const userId = readUserId()
  if (!snapshot) {
    return <Text p="md">Собираем стол…</Text>
  }
  const scene = snapshot.scenes.find(item => item.active) ?? snapshot.scenes[0]
  const nextGridKey = scene ? `${scene.id}:${scene.grid.columns}:${scene.grid.rows}:${scene.grid.cellSize}` : ''
  if (scene && gridKey !== nextGridKey) {
    setGridKey(nextGridKey)
    setColumns(scene.grid.columns)
    setRows(scene.grid.rows)
    setCellSize(scene.grid.cellSize)
  }
  const dm = snapshot.campaign.role === 'dm'
  const monsters = (srd.data ?? []).filter(entry => entry.kind === 'monster')
  const sheet = snapshot.characters.find(character => character.userId === userId) ?? null
  const avatars = Object.fromEntries(snapshot.characters.flatMap(character => character.avatarUrl ? [[character.id, character.avatarUrl]] : []))
  const roster = dm ? snapshot.characters : snapshot.characters.filter(character => character.userId === userId)
  function toggleCharacter(characterId: string) {
    if (!scene || !snapshot)
      return
    const placed = snapshot.tokens.some(token => token.sceneId === scene.id && token.characterId === characterId)
    void apiFetch(`/api/campaigns/${snapshot.campaign.id}/scenes/${scene.id}/characters/${characterId}`, {
      method: placed ? 'DELETE' : 'POST',
    })
  }
  const invite = `${window.location.origin}/join/${snapshot.campaign.inviteCode}`
  if (scene && notesScene !== scene.id) {
    setNotesScene(scene.id)
    setNotes(scene.dmNotes ?? '')
  }
  return (
    <Stack p="sm" gap="sm" h="100vh" style={{ overflow: 'hidden' }}>
      <Group justify="space-between">
        <div>
          <Title order={3}>{snapshot.campaign.name}</Title>
          <Text size="sm" c="dimmed">{dm ? 'Мастер' : 'Игрок'}</Text>
        </div>
        <Group>
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              scoped(appScope, () => {
                void homeRoute.open({})
              })
            }}
          >
            Кампании
          </Button>
          <Button
            size="sm"
            variant="light"
            onClick={() => {
              scoped(appScope, () => {
                void characterRoute.open({ params: { id: routeParams.id } })
              })
            }}
          >
            Персонаж
          </Button>
        </Group>
      </Group>
      {window.location.hostname === 'localhost' && (
        <Text size="sm">
          {`Ссылка с localhost друзьям не подойдёт. Запусти scripts/print-join-url.ps1 и отдай тот адрес с кодом ${snapshot.campaign.inviteCode}.`}
        </Text>
      )}
      <Text size="sm">{`Приглашение: ${invite}`}</Text>
      {dm && (
        <Stack gap={6}>
          <Group gap="xs" align="flex-end">
            <Select
              size="xs"
              label="Карта"
              data={snapshot.scenes.map(item => ({ value: item.id, label: item.name }))}
              value={scene?.id ?? null}
              onChange={(value) => {
                setConfirmDelete(false)
                if (value)
                  void apiFetch(`/api/campaigns/${snapshot.campaign.id}/scenes/${value}`, { method: 'PATCH', body: JSON.stringify({ active: true }) })
              }}
              allowDeselect={false}
              w={180}
            />
            <TextInput
              size="xs"
              label="Новая карта"
              placeholder="Пещера"
              value={mapName}
              onChange={event => setMapName(event.currentTarget.value)}
            />
            <Button
              size="xs"
              disabled={mapName.trim().length === 0}
              onClick={() => {
                void apiFetch(`/api/campaigns/${snapshot.campaign.id}/scenes`, {
                  method: 'POST',
                  body: JSON.stringify({ name: mapName.trim() }),
                })
                setMapName('')
              }}
            >
              Создать
            </Button>
            <Button
              size="xs"
              color="red"
              variant={confirmDelete ? 'filled' : 'light'}
              disabled={!scene}
              onClick={() => {
                if (!scene)
                  return
                if (!confirmDelete) {
                  setConfirmDelete(true)
                  return
                }
                setConfirmDelete(false)
                void apiFetch(`/api/campaigns/${snapshot.campaign.id}/scenes/${scene.id}`, { method: 'DELETE' })
              }}
            >
              {confirmDelete ? 'Точно удалить' : 'Удалить карту'}
            </Button>
          </Group>
          {scene && (
            <Group gap="xs" align="flex-end">
              {fieldPresets.map(preset => (
                <Button
                  key={preset.label}
                  size="xs"
                  variant={columns === preset.columns && rows === preset.rows && cellSize === preset.cellSize ? 'filled' : 'light'}
                  onClick={() => {
                    setColumns(preset.columns)
                    setRows(preset.rows)
                    setCellSize(preset.cellSize)
                    void apiFetch(`/api/campaigns/${snapshot.campaign.id}/scenes/${scene.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({
                        grid: { columns: preset.columns, rows: preset.rows, cellSize: preset.cellSize },
                      }),
                    })
                  }}
                >
                  {preset.label}
                </Button>
              ))}
              <NumberInput size="xs" w={90} label="Колонки" min={1} max={200} allowDecimal={false} value={columns} onChange={value => setColumns(readCount(value, columns))} />
              <NumberInput size="xs" w={90} label="Ряды" min={1} max={200} allowDecimal={false} value={rows} onChange={value => setRows(readCount(value, rows))} />
              <NumberInput size="xs" w={100} label="Клетка, px" min={8} max={256} allowDecimal={false} value={cellSize} onChange={value => setCellSize(readCount(value, cellSize))} />
              <Button
                size="xs"
                variant="light"
                onClick={() => void apiFetch(`/api/campaigns/${snapshot.campaign.id}/scenes/${scene.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    grid: {
                      columns: clampInt(columns, 1, 200),
                      rows: clampInt(rows, 1, 200),
                      cellSize: clampInt(cellSize, 8, 256),
                    },
                  }),
                })}
              >
                Размер поля
              </Button>
            </Group>
          )}
        </Stack>
      )}
      <Group align="stretch" wrap="nowrap" gap="sm" style={{ flex: 1, minHeight: 0 }}>
        <Paper withBorder p={0} style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 8 }}>
            {scene
              ? <MapBoard scene={scene} tokens={snapshot.tokens.filter(token => token.sceneId === scene.id)} dm={dm} avatars={avatars} />
              : <Text>Нет сцены</Text>}
          </div>
        </Paper>
        <Stack w={360} gap="sm" style={{ flex: 'none', minHeight: 0, overflow: 'auto' }}>
          <Paper withBorder p="sm">
            <Text fw={700}>Инициатива</Text>
            {snapshot.combat
              ? (
                  <>
                    {snapshot.combat.combatants.map((combatant, index) => (
                      <Text key={combatant.id} fw={index === snapshot.combat?.activeIndex ? 700 : 400}>
                        {`${combatant.initiative}. ${combatant.name} — ${combatant.hpCurrent}/${combatant.hpMax}${combatant.slotSpentThisTurn ? ' · ячейка потрачена' : ''}`}
                      </Text>
                    ))}
                    <Button
                      size="xs"
                      variant="light"
                      mt="xs"
                      disabled={snapshot.combat.combatants[snapshot.combat.activeIndex]?.slotSpentThisTurn}
                      onClick={() => {
                        const active = snapshot.combat?.combatants[snapshot.combat.activeIndex]
                        if (active)
                          sendLive({ type: 'slot', combatantId: active.id })
                      }}
                    >
                      Ячейка за ход
                    </Button>
                  </>
                )
              : <Text size="sm" c="dimmed">Бой не начат</Text>}
            {dm && scene && (
              <Group mt="xs" gap={6}>
                <Button size="xs" variant={snapshot.combat ? 'light' : 'filled'} onClick={() => sendLive({ type: 'combat.start', sceneId: scene.id })}>Начать</Button>
                <Button size="xs" variant={snapshot.combat ? 'filled' : 'default'} disabled={!snapshot.combat} onClick={() => sendLive({ type: 'combat.next', sceneId: scene.id })}>Дальше</Button>
                <Button size="xs" variant="light" color="red" disabled={!snapshot.combat} onClick={() => sendLive({ type: 'combat.end', sceneId: scene.id })}>Конец</Button>
              </Group>
            )}
          </Paper>
          <DiceTray rolls={snapshot.rolls} />
          {roster.length > 0 && (
            <Paper withBorder p="sm">
              <Text fw={700}>Персонажи</Text>
              {roster.map((character) => {
                const placed = Boolean(scene && snapshot.tokens.some(token => token.sceneId === scene.id && token.characterId === character.id))
                return (
                  <Group key={character.id} gap={6} wrap="nowrap" mt={4}>
                    <Avatar src={character.avatarUrl ?? undefined} alt="" size="sm" radius="xl" />
                    <Text size="sm" style={{ flex: 1 }} lineClamp={1}>{character.name}</Text>
                    <Button size="compact-xs" variant={placed ? 'light' : 'filled'} color={placed ? 'red' : undefined} disabled={!scene} onClick={() => toggleCharacter(character.id)}>
                      {placed ? 'Убрать' : 'На карту'}
                    </Button>
                    <PortraitUpload campaignId={snapshot.campaign.id} characterId={character.id} />
                  </Group>
                )
              })}
            </Paper>
          )}
          {sheet && (
            <Paper withBorder p="sm">
              <Group gap="sm" wrap="nowrap">
                <Avatar src={sheet.avatarUrl ?? undefined} alt="" size="lg" radius="xl" />
                <div>
                  <Text fw={700}>{sheet.name}</Text>
                  <Text size="sm">
                    {`Хиты ${sheet.hpCurrent}/${sheet.hpMax}${isBloodied(sheet.hpCurrent, sheet.hpMax) ? ' · кровь' : ''} · КД ${sheet.ac} · истощение ${sheet.exhaustion}${sheet.heroicInspiration ? ' · вдохновение' : ''}`}
                  </Text>
                </div>
              </Group>
              <Text size="sm">
                {`Спасброски от смерти ${sheet.deathSaves.successes}/3 и ${sheet.deathSaves.failures}/3`}
              </Text>
              {sheet.attacks.map(attack => (
                <AttackRoll key={attack.id} attack={attack} exhaustion={sheet.exhaustion} />
              ))}
              <ClassKit sheet={sheet} entries={srd.data ?? []} />
              <SheetTrackers sheet={sheet} />
              <Group mt="xs" gap={6}>
                <Button size="xs" variant="light" onClick={() => void apiFetch(`/api/campaigns/${sheet.campaignId}/characters/${sheet.id}/rest`, { method: 'POST', body: JSON.stringify({ kind: 'short' }) })}>Короткий отдых</Button>
                <Button size="xs" variant="default" onClick={() => void apiFetch(`/api/campaigns/${sheet.campaignId}/characters/${sheet.id}/rest`, { method: 'POST', body: JSON.stringify({ kind: 'long' }) })}>Длинный отдых</Button>
              </Group>
            </Paper>
          )}
          {dm && scene && (
            <Paper withBorder p="sm">
              <Text fw={700}>Монстры SRD</Text>
              <Select
                label="Поиск"
                searchable
                nothingFoundMessage="Нет такого монстра"
                data={monsters.map(monster => ({ value: monster.id, label: monster.name }))}
                value={monsterId}
                onChange={value => value && setMonsterId(value)}
                allowDeselect={false}
              />
              <Button
                size="xs"
                mt="xs"
                variant="light"
                onClick={() => {
                  const monster = monsters.find(entry => entry.id === monsterId)
                  const hp = Number(monster?.body.hp ?? 1)
                  void apiFetch(`/api/campaigns/${snapshot.campaign.id}/scenes/${scene.id}/tokens`, {
                    method: 'POST',
                    body: JSON.stringify({ name: monster?.name ?? 'Монстр', hpCurrent: hp, hpMax: hp, monsterId, hidden: false }),
                  })
                }}
              >
                На карту
              </Button>
              <MonsterActions monster={monsters.find(entry => entry.id === monsterId)} />
              {snapshot.tokens.filter(token => token.sceneId === scene.id).map(token => (
                <Group key={token.id} gap={4} wrap="nowrap" justify="space-between">
                  <Text size="sm" style={{ flex: 1, minWidth: 0 }} lineClamp={1} c={token.hpCurrent <= 0 ? 'red' : undefined}>
                    {`${token.name} ${token.hpCurrent}/${token.hpMax}${token.hpCurrent <= 0 ? ' · мёртв' : ''}`}
                  </Text>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon size="sm" variant="light" color="red" aria-label="Урон" onClick={() => sendLive({ type: 'hp', tokenId: token.id, delta: -1 })}>
                      <IconMinus size={14} />
                    </ActionIcon>
                    <ActionIcon size="sm" variant="light" color="teal" aria-label="Лечение" onClick={() => sendLive({ type: 'hp', tokenId: token.id, delta: 1 })}>
                      <IconPlus size={14} />
                    </ActionIcon>
                    <Button size="compact-xs" variant="light" onClick={() => sendLive({ type: 'token.hide', tokenId: token.id, hidden: !token.hidden })}>{token.hidden ? 'Показать' : 'Скрыть'}</Button>
                    <ActionIcon size="sm" variant="subtle" color="red" aria-label="Удалить фишку" onClick={() => sendLive({ type: 'token.delete', tokenId: token.id })}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              ))}
              <Textarea label="Заметки мастера" value={notes} onChange={event => setNotes(event.currentTarget.value)} />
              <Button
                size="xs"
                variant="light"
                mt="xs"
                onClick={() => void apiFetch(`/api/campaigns/${snapshot.campaign.id}/scenes/${scene.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ dmNotes: notes }),
                })}
              >
                Сохранить заметки
              </Button>
              <MapUpload campaignId={snapshot.campaign.id} sceneId={scene.id} />
            </Paper>
          )}
          <Text size="xs" c="dimmed">{SRD_ATTRIBUTION}</Text>
        </Stack>
      </Group>
    </Stack>
  )
}

function AttackRoll(props: { attack: AttackDef, exhaustion?: number }) {
  const save = /сл\s*\d+/i.test(props.attack.damageType)
  const damage = props.attack.damageDice.includes('d')
    ? `${props.attack.damageDice}${props.attack.damageBonus ? `+${props.attack.damageBonus}` : ''}`
    : ''
  return (
    <Group gap={4} wrap="wrap">
      <Text size="sm">{props.attack.name}</Text>
      {props.attack.attackBonus > 0 && (
        <Button size="compact-xs" variant="light" onClick={() => sendLive({ type: 'roll', label: props.attack.name, formula: `1d20+${props.attack.attackBonus}`, mode: 'normal', exhaustion: props.exhaustion ?? 0 })}>Атака</Button>
      )}
      {save && (
        <Button size="compact-xs" variant="default" onClick={() => sendLive({ type: 'roll', label: props.attack.damageType, formula: '1d20', mode: 'normal', exhaustion: props.exhaustion ?? 0 })}>Спасбросок</Button>
      )}
      {damage && (
        <>
          <Button size="compact-xs" variant="light" color="orange" onClick={() => sendLive({ type: 'roll', label: `${props.attack.name} урон`, formula: damage, mode: 'normal' })}>Урон</Button>
          <Button size="compact-xs" variant="light" color="red" onClick={() => sendLive({ type: 'roll', label: `${props.attack.name} крит`, formula: damage, mode: 'crit' })}>Крит</Button>
        </>
      )}
    </Group>
  )
}

const conditionNames = ['ослеплён', 'испуган', 'отравлен', 'опутан', 'лежащий', 'без сознания']

function SheetTrackers(props: { sheet: CharacterDto }) {
  function patch(body: Record<string, unknown>) {
    void apiFetch(`/api/campaigns/${props.sheet.campaignId}/characters/${props.sheet.id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }
  return (
    <Stack gap={4}>
      <Group gap={4}>
        <Button size="compact-xs" variant={props.sheet.heroicInspiration ? 'filled' : 'light'} onClick={() => patch({ heroicInspiration: !props.sheet.heroicInspiration })}>Вдохновение</Button>
        <Button size="compact-xs" variant="default" onClick={() => patch({ exhaustion: Math.max(0, props.sheet.exhaustion - 1) })}>Истощение −</Button>
        <Button size="compact-xs" variant="default" onClick={() => patch({ exhaustion: Math.min(10, props.sheet.exhaustion + 1) })}>Истощение +</Button>
      </Group>
      {isDeadFromExhaustion(props.sheet.exhaustion) && <Text size="sm">Истощение 10: персонаж мёртв</Text>}
      <Group gap={4}>
        <Button size="compact-xs" variant="light" color="teal" onClick={() => patch({ deathSaves: { ...props.sheet.deathSaves, successes: Math.min(3, props.sheet.deathSaves.successes + 1) } })}>Успех смерти</Button>
        <Button size="compact-xs" variant="light" color="red" onClick={() => patch({ deathSaves: { ...props.sheet.deathSaves, failures: Math.min(3, props.sheet.deathSaves.failures + 1) } })}>Провал смерти</Button>
      </Group>
      <Group gap={4}>
        {conditionNames.map(name => (
          <Button
            key={name}
            size="compact-xs"
            variant={props.sheet.conditions.includes(name) ? 'filled' : 'light'}
            onClick={() => patch({
              conditions: props.sheet.conditions.includes(name)
                ? props.sheet.conditions.filter(item => item !== name)
                : [...props.sheet.conditions, name],
            })}
          >
            {name}
          </Button>
        ))}
      </Group>
    </Stack>
  )
}

function MonsterActions(props: { monster?: SrdEntryDto }) {
  const attacks = Array.isArray(props.monster?.body.attacks) ? props.monster?.body.attacks as AttackDef[] : []
  return (
    <Stack gap={4} my="xs">
      {attacks.map(attack => <AttackRoll key={attack.id} attack={attack} />)}
    </Stack>
  )
}

function readCount(value: string | number, fallback: number) {
  const next = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(next) ? Math.trunc(next) : fallback
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function PortraitUpload(props: { campaignId: string, characterId: string }) {
  return (
    <FileButton
      accept="image/*"
      onChange={(file) => {
        if (!file)
          return
        const body = new FormData()
        body.set('file', file)
        void apiFetch(`/api/campaigns/${props.campaignId}/characters/${props.characterId}/avatar`, { method: 'POST', body })
      }}
    >
      {buttonProps => <Button {...buttonProps} size="compact-xs" variant="default">Портрет</Button>}
    </FileButton>
  )
}

function MapUpload(props: { campaignId: string, sceneId: string }) {
  return (
    <FileButton
      accept="image/*"
      onChange={(file) => {
        if (!file)
          return
        const body = new FormData()
        body.set('file', file)
        void apiFetch(`/api/campaigns/${props.campaignId}/scenes/${props.sceneId}/map`, { method: 'POST', body })
      }}
    >
      {buttonProps => <Button {...buttonProps} size="xs" variant="default" mt="xs">Загрузить карту</Button>}
    </FileButton>
  )
}
