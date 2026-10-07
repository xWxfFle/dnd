import type { AttackDef, CharacterDto, TokenDto } from '@dnd/shared'
import { abilities, abilityLabel, imageLimitMb } from '@dnd/shared'
import { ActionIcon, Avatar, Badge, Box, Button, Collapse, ColorInput, Divider, Drawer, FileButton, Group, Modal, NumberInput, Paper, SegmentedControl, Select, Slider, Stack, Tabs, Text, Textarea, TextInput, Title } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { MapBoard } from '@/features/table-map/board'
import { hexFieldSize } from '@/features/table-map/grid'
import { ClassKit } from '@/pages/table/class-kit'
import { CombatStrip, HpAdjust, HpBar } from '@/pages/table/combat-strip'
import { DiceLog, DiceTray } from '@/pages/table/dice-tray'
import { GearList } from '@/pages/table/gear-list'
import { liveSnapshot } from '@/pages/table/live'
import { SkillRolls } from '@/pages/table/skill-rolls'
import { srdKitQuery } from '@/shared/api'
import { AccountMenu } from '@/shared/ui/account-menu'
import {
  abilityScoreEdited,
  attackRolled,
  campaignMembers,
  campaignsOpened,
  catalogNames,
  cellSize,
  cellSizeChanged,
  columns,
  columnsChanged,
  conditionNames,
  conditionToggled,
  confirmDelete,
  dm,
  fieldPresets,
  fogUpdated,
  gridApplyRequested,
  gridColor,
  gridColorChanged,
  gridKind,
  gridKindChanged,
  gridOpacity,
  gridOpacityChanged,
  gridPresetChosen,
  heroCreateRequested,
  hexFacing,
  hexFacingChanged,
  imageScale,
  imageScaleChanged,
  levelChoiceSubmitted,
  mapFileChosen,
  mapMeasured,
  mapName,
  mapNameChanged,
  mapWidth,
  mobPickerOpened,
  notes,
  notesChanged,
  notesSaveRequested,
  offsetX,
  offsetXChanged,
  offsetY,
  offsetYChanged,
  restRequested,
  roster,
  rows,
  rowsChanged,
  scene,
  sceneCreateRequested,
  sceneDeletePressed,
  sceneSelected,
  sceneTokens,
  sheets,
  smoothing,
  smoothingChanged,
  tokenMoved,
  tokenRemoved,
  viewerId,
} from './model'
import { MonsterEdit } from './monster-edit'
import { ownerCaption } from './owner'
import { OwnerMark } from './owner-mark'
import { AddMobModal, TemplateList } from './preset-panel'
import { SheetOverview } from './sheet-overview'

const tableWash = {
  overflow: 'hidden',
  backgroundColor: 'light-dark(var(--mantine-color-gray-1), #090a0c)',
  backgroundImage: 'radial-gradient(ellipse 72% 58% at 40% 46%, light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5)), transparent 70%), radial-gradient(ellipse 130% 120% at 50% 50%, transparent 42%, light-dark(var(--mantine-color-gray-3), #050506) 100%)',
} as const

const panelGlass = {
  backgroundColor: 'light-dark(color-mix(in srgb, white 78%, transparent), color-mix(in srgb, var(--mantine-color-dark-7) 76%, transparent))',
} as const

export function TablePage() {
  const state = useUnit({
    snapshot: liveSnapshot,
    scene,
    dm,
    sheets,
    sceneTokens,
    sceneSelected,
    campaignsOpened,
    members: campaignMembers,
    viewer: viewerId,
  })
  const [focusToken, setFocusToken] = useState<{ x: number, y: number, tick: number } | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [tableOpen, setTableOpen] = useState(false)
  const [diceOpen, setDiceOpen] = useState(false)
  if (!state.snapshot) {
    return (
      <Group justify="space-between" p="md">
        <Text>Собираем стол…</Text>
        <AccountMenu />
      </Group>
    )
  }
  const snapshot = state.snapshot
  const current = state.scene
  const invite = `${window.location.origin}/join/${snapshot.campaign.inviteCode}`
  const openSheet = state.sheets.find(item => item.id === sheetId) ?? null
  const openToken = state.sceneTokens.find(item => item.id === tokenId && item.characterId == null) ?? null
  const focusOn = (id: string) => {
    const token = state.sceneTokens.find(item => item.id === id)
    if (!token)
      return
    setFocusToken({ x: token.x, y: token.y, tick: Date.now() })
  }
  const openHero = (characterId: string) => {
    if (!state.sheets.some(item => item.id === characterId))
      return
    setTableOpen(false)
    setTokenId(null)
    setSheetId(characterId)
  }
  const openCreature = (id: string) => {
    const token = state.sceneTokens.find(item => item.id === id)
    if (!token)
      return
    focusOn(id)
    setTableOpen(false)
    if (token.characterId) {
      openHero(token.characterId)
      return
    }
    setSheetId(null)
    setTokenId(id)
  }
  const closeSheet = () => {
    setSheetId(null)
    setTokenId(null)
  }
  const openTable = () => {
    setSheetId(null)
    setTokenId(null)
    setTableOpen(true)
  }
  return (
    <Stack p="sm" gap="sm" h="100vh" style={tableWash}>
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Button size="xs" variant="subtle" onClick={() => void state.campaignsOpened()}>Кампании</Button>
          <Text size="sm" c="dimmed">/</Text>
          <Title order={4} lineClamp={1}>{snapshot.campaign.name}</Title>
          <Badge variant="light" size="sm">{state.dm ? 'Мастер' : 'Игрок'}</Badge>
        </Group>
        <Group gap="xs" wrap="nowrap">
          {state.dm
            ? (
                <Select
                  size="xs"
                  aria-label="Карта"
                  data={snapshot.scenes.map(item => ({ value: item.id, label: item.name }))}
                  value={current?.id ?? null}
                  onChange={(value) => {
                    if (value)
                      state.sceneSelected(value)
                  }}
                  allowDeselect={false}
                  w={180}
                />
              )
            : <Text size="sm" lineClamp={1}>{current?.name ?? 'Нет сцены'}</Text>}
          {state.dm && snapshot.campaign.inviteCode ? <InviteCopy value={invite} /> : null}
          {state.dm && <Button size="xs" variant="light" onClick={openTable}>Стол</Button>}
          <AccountMenu />
        </Group>
      </Group>
      <Group align="stretch" wrap="nowrap" gap="sm" style={{ flex: 1, minHeight: 0 }}>
        <Stack gap="sm" style={{ flex: 1, height: '100%', minWidth: 0, minHeight: 0, position: 'relative' }}>
          <Paper withBorder p={0} style={{ ...panelGlass, flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 8 }}>
              <TableMap focusToken={focusToken} />
            </div>
          </Paper>
          {(openSheet ?? openToken) && (
            <Paper withBorder p="sm" style={{ ...panelGlass, position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2, maxHeight: '42vh', overflow: 'auto' }}>
              <Group justify="flex-end" mb="xs">
                <Button size="xs" variant="subtle" onClick={closeSheet}>Закрыть</Button>
              </Group>
              {openToken
                ? (
                    <MonsterEdit token={openToken} />
                  )
                : openSheet && (
                  <Stack gap="sm">
                    {state.sheets.length > 1 && (
                      <Select
                        size="xs"
                        aria-label="Герой"
                        data={state.sheets.map(item => ({
                          value: item.id,
                          label: `${item.name} · ${ownerCaption(item.userId, state.viewer, state.members)}`,
                        }))}
                        value={openSheet.id}
                        onChange={setSheetId}
                        allowDeselect={false}
                      />
                    )}
                    <CharacterSheet
                      sheet={openSheet}
                      onMap={state.sceneTokens.some(token => token.characterId === openSheet.id)}
                      sceneReady={Boolean(current)}
                    />
                  </Stack>
                )}
            </Paper>
          )}
        </Stack>
        <Stack gap="sm" w={420} h="100%" style={{ flex: 'none', minHeight: 0, overflow: 'hidden' }}>
          <Paper withBorder p="sm" style={{ ...panelGlass, flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Tabs defaultValue={state.dm ? 'heroes' : 'sheets'}>
              <Tabs.List grow>
                {state.dm
                  ? (
                      <>
                        <Tabs.Tab value="heroes">Герои</Tabs.Tab>
                        <Tabs.Tab value="mobs">Мобы</Tabs.Tab>
                      </>
                    )
                  : <Tabs.Tab value="sheets">Существа</Tabs.Tab>}
                <Tabs.Tab value="combat">Бой</Tabs.Tab>
              </Tabs.List>
              {state.dm
                ? (
                    <>
                      <Tabs.Panel value="heroes" pt="sm">
                        <HeroesPanel onOpenHero={openHero} />
                      </Tabs.Panel>
                      <Tabs.Panel value="mobs" pt="sm">
                        <MobsPanel onOpenToken={openCreature} />
                      </Tabs.Panel>
                    </>
                  )
                : (
                    <Tabs.Panel value="sheets" pt="sm">
                      <SheetList sheets={state.sheets} tokens={state.sceneTokens} onOpen={openHero} />
                    </Tabs.Panel>
                  )}
              <Tabs.Panel value="combat" pt="sm">
                <CombatStrip
                  combat={snapshot.combat}
                  dm={state.dm}
                  tokens={state.sceneTokens}
                  characters={snapshot.characters}
                  onOpenSheet={openHero}
                  onOpenToken={openCreature}
                  onFocus={focusOn}
                />
              </Tabs.Panel>
            </Tabs>
          </Paper>
          <Paper withBorder p="sm" style={{ ...panelGlass, flex: 'none', maxHeight: '46%', overflow: 'auto' }}>
            <Stack gap="xs">
              <DiceLog />
              <Button size="xs" variant="subtle" onClick={() => setDiceOpen(open => !open)}>
                {diceOpen ? 'Скрыть бросок' : 'Бросок'}
              </Button>
              <Collapse expanded={diceOpen}>
                <DiceTray />
              </Collapse>
            </Stack>
          </Paper>
        </Stack>
      </Group>
      <Drawer opened={tableOpen} onClose={() => setTableOpen(false)} position="right" title="Стол" size={420} padding="md">
        <TableSetup />
      </Drawer>
    </Stack>
  )
}

function SheetList(props: { sheets: CharacterDto[], tokens: { id: string, characterId: string | null }[], onOpen: (characterId: string) => void }) {
  const createHero = useUnit(heroCreateRequested)
  return (
    <Stack gap="sm">
      <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => void createHero()}>Новый герой</Button>
      {props.sheets.length === 0 && <Text size="xs" c="dimmed">Героев пока нет</Text>}
      {props.sheets.map(sheet => (
        <HeroCard
          key={sheet.id}
          character={sheet}
          tokenId={props.tokens.find(token => token.characterId === sheet.id)?.id ?? null}
          onOpen={props.onOpen}
        />
      ))}
    </Stack>
  )
}

function TableMap(props: { focusToken: { x: number, y: number, tick: number } | null }) {
  const state = useUnit({
    scene,
    dm,
    sceneTokens,
    tokenMoved,
    fogUpdated,
    mapMeasured,
  })
  if (!state.scene)
    return <Text>Нет сцены</Text>
  return (
    <MapBoard
      scene={state.scene}
      tokens={state.sceneTokens}
      dm={state.dm}
      focusToken={props.focusToken}
      onTokenMoved={state.tokenMoved}
      onFogUpdated={state.fogUpdated}
      onMapMeasured={state.mapMeasured}
    />
  )
}

function InviteCopy(props: { value: string }) {
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)
  return (
    <>
      <Button size="xs" variant="default" title={props.value} onClick={() => void copyInvite(props.value, setCopied, setRevealed)}>
        {copied ? 'Скопировано' : 'Ссылка'}
      </Button>
      {revealed && <Text size="xs" ff="monospace" style={{ userSelect: 'all' }}>{props.value}</Text>}
    </>
  )
}

async function copyInvite(value: string, mark: (copied: boolean) => void, reveal: (shown: boolean) => void) {
  const ok = await writeClipboard(value)
  if (!ok) {
    reveal(true)
    return
  }
  mark(true)
  window.setTimeout(mark, 1200, false)
}

async function writeClipboard(value: string) {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    }
    catch {
      // По http с чужого адреса clipboard API есть, но запись запрещена.
    }
  }
  const area = document.createElement('textarea')
  area.value = value
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.append(area)
  area.focus()
  area.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  }
  catch {
    ok = false
  }
  area.remove()
  return ok
}

function HeroesPanel(props: { onOpenHero: (characterId: string) => void }) {
  const state = useUnit({
    roster,
    sceneTokens,
    createHero: heroCreateRequested,
  })
  return (
    <Stack gap="sm">
      <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => void state.createHero()}>Новый герой</Button>
      {state.roster.length === 0 && <Text size="xs" c="dimmed">Героев пока нет</Text>}
      {state.roster.map(character => (
        <HeroCard
          key={character.id}
          character={character}
          tokenId={state.sceneTokens.find(token => token.characterId === character.id)?.id ?? null}
          onOpen={props.onOpenHero}
        />
      ))}
    </Stack>
  )
}

function MobsPanel(props: { onOpenToken: (tokenId: string) => void }) {
  const state = useUnit({
    sceneTokens,
    scene,
    remove: tokenRemoved,
    openPicker: mobPickerOpened,
  })
  const [addOpen, setAddOpen] = useState(false)
  const sceneReady = Boolean(state.scene)
  const mobs = state.sceneTokens.filter(token => token.characterId == null)
  return (
    <Stack gap="sm">
      <Button
        size="xs"
        variant="light"
        disabled={!sceneReady}
        onClick={() => {
          state.openPicker()
          setAddOpen(true)
        }}
      >
        Добавить моба
      </Button>
      <AddMobModal opened={addOpen} onClose={() => setAddOpen(false)} sceneReady={sceneReady} />
      <TemplateList sceneReady={sceneReady} />
      {mobs.length === 0 && <Text size="xs" c="dimmed">На сцене нет мобов</Text>}
      {mobs.map(token => (
        <MobCard key={token.id} token={token} onOpen={props.onOpenToken} onRemove={state.remove} />
      ))}
    </Stack>
  )
}

function TableSetup() {
  const state = useUnit({
    scene,
    mapName,
    notes,
    confirmDelete,
    columns,
    rows,
    cellSize,
    gridKind,
    hexFacing,
    gridColor,
    gridOpacity,
    imageScale,
    offsetX,
    offsetY,
    smoothing,
    mapWidth,
    mapNameChanged,
    notesChanged,
    notesSaveRequested,
    sceneCreateRequested,
    sceneDeletePressed,
    gridPresetChosen,
    columnsChanged,
    rowsChanged,
    cellSizeChanged,
    gridKindChanged,
    hexFacingChanged,
    gridColorChanged,
    gridOpacityChanged,
    imageScaleChanged,
    offsetXChanged,
    offsetYChanged,
    smoothingChanged,
    gridApplyRequested,
  })
  const current = state.scene
  function fitMap() {
    if (state.mapWidth <= 0)
      return
    const widthByKind = {
      hex: hexFieldSize(state.hexFacing, state.columns, state.rows, state.cellSize).width,
      square: state.columns * state.cellSize,
    } as const satisfies Record<'hex' | 'square', number>
    state.imageScaleChanged(widthByKind[state.gridKind] / state.mapWidth)
  }
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text fw={700}>Сцена</Text>
        <TextInput
          size="xs"
          aria-label="Новая карта"
          placeholder="Новая карта"
          value={state.mapName}
          onChange={event => state.mapNameChanged(event.currentTarget.value)}
        />
        <Group gap="xs">
          <Button size="xs" disabled={state.mapName.trim().length === 0} onClick={() => void state.sceneCreateRequested()}>Создать</Button>
          <Button size="xs" variant={state.confirmDelete ? 'filled' : 'default'} disabled={!current} onClick={() => void state.sceneDeletePressed()}>
            {state.confirmDelete ? 'Точно удалить' : 'Удалить'}
          </Button>
        </Group>
      </Stack>
      {current && (
        <Textarea
          size="xs"
          label="Заметки"
          description="Только мастер. У каждой карты свои."
          placeholder="Ловушки, таймеры, кто что знает"
          autosize
          minRows={4}
          maxRows={12}
          resize="vertical"
          value={state.notes}
          onChange={event => state.notesChanged(event.currentTarget.value)}
          onBlur={() => void state.notesSaveRequested()}
        />
      )}
      {current && (
        <Stack gap="xs">
          <Text fw={700}>Поле</Text>
          <Group gap={6}>
            {fieldPresets.map(preset => (
              <Button
                key={preset.label}
                size="xs"
                variant={state.columns === preset.columns && state.rows === preset.rows && state.cellSize === preset.cellSize ? 'filled' : 'default'}
                onClick={() => state.gridPresetChosen(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </Group>
          <NumberInput size="xs" label="Колонки" min={1} max={200} allowDecimal={false} value={state.columns} onChange={state.columnsChanged} />
          <NumberInput size="xs" label="Ряды" min={1} max={200} allowDecimal={false} value={state.rows} onChange={state.rowsChanged} />
          <NumberInput size="xs" label="Шаг сетки, px" description="Только линии. Картинка от этого не растягивается." min={8} max={256} allowDecimal={false} value={state.cellSize} onChange={state.cellSizeChanged} />
          <NumberInput size="xs" label="Смещение по X, px" min={-4000} max={4000} allowDecimal={false} value={state.offsetX} onChange={state.offsetXChanged} />
          <NumberInput size="xs" label="Смещение по Y, px" min={-4000} max={4000} allowDecimal={false} value={state.offsetY} onChange={state.offsetYChanged} />
          <SegmentedControl
            size="xs"
            fullWidth
            value={state.gridKind}
            onChange={state.gridKindChanged}
            data={[{ label: 'Квадрат', value: 'square' }, { label: 'Гекс', value: 'hex' }]}
          />
          {state.gridKind === 'hex' && (
            <SegmentedControl
              size="xs"
              fullWidth
              value={state.hexFacing}
              onChange={state.hexFacingChanged}
              data={[{ label: 'Вершиной', value: 'pointy' }, { label: 'На 90°', value: 'flat' }]}
            />
          )}
          <ColorInput size="xs" label="Цвет сетки" format="hex" value={state.gridColor} onChange={state.gridColorChanged} withEyeDropper={false} />
          <Text size="xs">Прозрачность сетки</Text>
          <Slider
            min={0}
            max={100}
            step={5}
            label={percentLabel}
            value={Math.round(state.gridOpacity * 100)}
            onChange={opacity => state.gridOpacityChanged(opacity / 100)}
            thumbLabel="Прозрачность сетки"
          />
          <Text size="xs">Масштаб карты</Text>
          <Text size="xs" c="dimmed">100% — размер файла. Сетка живёт отдельно.</Text>
          <Slider
            min={10}
            max={800}
            step={5}
            label={percentLabel}
            value={Math.round(state.imageScale * 100)}
            onChange={scale => state.imageScaleChanged(scale / 100)}
            thumbLabel="Масштаб карты"
          />
          <Button size="xs" variant="default" disabled={state.mapWidth <= 0} onClick={fitMap}>Подогнать под сетку</Button>
          <SegmentedControl
            size="xs"
            fullWidth
            value={state.smoothing}
            onChange={state.smoothingChanged}
            data={[{ label: 'Плавно', value: 'linear' }, { label: 'Пиксели', value: 'nearest' }]}
          />
          <Button size="xs" onClick={() => void state.gridApplyRequested()}>Применить</Button>
        </Stack>
      )}
      {current && <MapUpload />}
    </Stack>
  )
}

function CharacterSheet(props: { sheet: CharacterDto, onMap: boolean, sceneReady: boolean }) {
  const { rest, rollAttack, master, viewer } = useUnit({
    rest: restRequested,
    rollAttack: attackRolled,
    master: dm,
    viewer: viewerId,
  })
  const sheet = props.sheet
  const editable = master || sheet.userId === viewer
  return (
    <Tabs defaultValue="overview" w="100%">
      <Tabs.List grow>
        <Tabs.Tab value="overview">Обзор</Tabs.Tab>
        <Tabs.Tab value="checks">Проверки</Tabs.Tab>
        <Tabs.Tab value="attacks">Атаки</Tabs.Tab>
        <Tabs.Tab value="kit">Умения</Tabs.Tab>
        <Tabs.Tab value="gear">Снаряжение</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview" pt="sm">
        <SheetOverview
          sheet={sheet}
          onMap={props.onMap}
          sceneReady={props.sceneReady}
          editable={editable}
          master={master}
        />
        {editable && <LevelChoiceModal sheet={sheet} />}
      </Tabs.Panel>
      <Tabs.Panel value="checks" pt="sm">
        <Stack gap="sm" align="flex-start">
          {master && <AbilityEditors sheet={sheet} />}
          <SkillRolls sheet={sheet} canRoll={editable} />
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="attacks" pt="sm">
        <Stack gap="sm">
          {sheet.attacks.length === 0
            ? <Text size="sm" c="dimmed">Нет атак</Text>
            : (
                <Group align="stretch" gap="sm">
                  {sheet.attacks.map(attack => (
                    <HeroAttack key={attack.id} attack={attack} exhaustion={sheet.exhaustion} canRoll={editable} onRoll={rollAttack} />
                  ))}
                </Group>
              )}
          {sheet.slots.length > 0 && (
            <>
              <Divider />
              <SlotPips slots={sheet.slots} />
            </>
          )}
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="kit" pt="sm">
        <ClassKit sheet={sheet} editable={editable} />
      </Tabs.Panel>
      <Tabs.Panel value="gear" pt="sm">
        <Stack gap="sm">
          {editable
            ? <GearList sheet={sheet} />
            : sheet.inventory.map(item => (
                <Paper key={item.id} withBorder radius="md" p="xs">
                  <Text size="sm">{item.name}</Text>
                </Paper>
              ))}
          {editable && (
            <>
              <ConditionTrackers sheet={sheet} />
              <Divider label="Отдых" labelPosition="left" />
              <Group gap="xs">
                <Button size="xs" variant="light" onClick={() => rest({ characterId: sheet.id, kind: 'short' })}>Короткий отдых</Button>
                <Button size="xs" variant="default" onClick={() => rest({ characterId: sheet.id, kind: 'long' })}>Длинный отдых</Button>
              </Group>
            </>
          )}
        </Stack>
      </Tabs.Panel>
    </Tabs>
  )
}

function HeroAttack(props: {
  attack: AttackDef
  exhaustion: number
  canRoll: boolean
  onRoll: (roll: { attack: AttackDef, kind: 'attack' | 'save', exhaustion: number }) => void
}) {
  const save = /сл\s*\d+/i.test(props.attack.damageType)
  const kind = save ? 'save' : 'attack'
  return (
    <Paper withBorder radius="md" p="sm" w={240}>
      <Stack gap={6} justify="space-between" h="100%">
        <Stack gap={4}>
          <Text size="sm" fw={600}>{props.attack.name}</Text>
          <Text size="xs" c="dimmed">{attackDetail(props.attack)}</Text>
        </Stack>
        {props.canRoll && (
          <Button size="xs" variant="default" onClick={() => props.onRoll({ attack: props.attack, kind, exhaustion: props.exhaustion })}>
            {save ? 'Спасбросок' : 'Бросок'}
          </Button>
        )}
      </Stack>
    </Paper>
  )
}

const pendingTitle = {
  asi: 'Увеличение характеристик',
  subclass: 'Подкласс',
  feat: 'Черта',
} as const satisfies Record<NonNullable<CharacterDto['pendingChoice']>, string>

function LevelChoiceModal(props: { sheet: CharacterDto }) {
  const { submit, entries } = useUnit({
    submit: levelChoiceSubmitted,
    entries: srdKitQuery.data,
  })
  const pending = props.sheet.pendingChoice
  const [bonuses, setBonuses] = useState({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 })
  const [subclassId, setSubclassId] = useState<string | null>(null)
  const [featId, setFeatId] = useState<string | null>(null)
  const total = abilities.reduce((sum, key) => sum + bonuses[key], 0)
  const classKey = props.sheet.classId.replace(/^class-/, '')
  const subclassOptions = (entries ?? [])
    .filter(entry => entry.kind === 'subclass' && entry.body.classId === classKey)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    .map(entry => ({ value: entry.id, label: entry.name }))
  const pickedSubclass = subclassId ?? (subclassOptions.length === 1 ? subclassOptions[0].value : null)
  const featOptions = (entries ?? [])
    .filter((entry) => {
      if (entry.kind !== 'feat')
        return false
      const category = entry.body.category
      if (entry.id === 'feat-ability-score-improvement' || category === 'asi')
        return false
      if (pending === 'feat')
        return category === 'epic-boon'
      return category !== 'epic-boon'
    })
    .map(entry => ({ value: entry.id, label: entry.name }))
  if (!pending)
    return null
  return (
    <Modal opened closeOnClickOutside={false} closeOnEscape={false} withCloseButton={false} title={pendingTitle[pending]} onClose={() => undefined}>
      <Stack gap="sm">
        {pending === 'asi' && (
          <>
            <Text size="sm">Распредели +2 между характеристиками (не выше 20) или возьми черту.</Text>
            {abilities.map(ability => (
              <NumberInput
                key={ability}
                size="xs"
                label={`${abilityLabel[ability]} (${props.sheet.abilities[ability]})`}
                min={0}
                max={2}
                hideControls
                value={bonuses[ability]}
                onChange={value => setBonuses(current => ({ ...current, [ability]: Math.max(0, Math.trunc(Number(value) || 0)) }))}
              />
            ))}
            <Button disabled={total !== 2} onClick={() => submit({ characterId: props.sheet.id, body: { kind: 'asi', bonuses } })}>
              {`Применить +${total}`}
            </Button>
            <Select label="Или черта" data={featOptions} value={featId} onChange={setFeatId} />
            <Button disabled={!featId} variant="light" onClick={() => featId && submit({ characterId: props.sheet.id, body: { kind: 'feat', featId } })}>
              Взять черту
            </Button>
          </>
        )}
        {pending === 'subclass' && (
          <>
            <Select label="Подкласс" data={subclassOptions} value={pickedSubclass} onChange={setSubclassId} />
            <Button disabled={!pickedSubclass} onClick={() => pickedSubclass && submit({ characterId: props.sheet.id, body: { kind: 'subclass', subclassId: pickedSubclass } })}>
              Выбрать
            </Button>
          </>
        )}
        {pending === 'feat' && (
          <>
            <Select label="Черта или дар" data={featOptions} value={featId} onChange={setFeatId} />
            <Button disabled={!featId} onClick={() => featId && submit({ characterId: props.sheet.id, body: { kind: 'feat', featId } })}>
              Выбрать
            </Button>
          </>
        )}
      </Stack>
    </Modal>
  )
}

function AbilityEditors(props: { sheet: CharacterDto }) {
  const edit = useUnit(abilityScoreEdited)
  return (
    <Group gap="xs">
      {abilities.map(key => (
        <NumberInput
          key={`${props.sheet.id}:${key}:${props.sheet.abilities[key]}`}
          size="xs"
          w={72}
          label={abilityLabel[key]}
          min={1}
          max={30}
          allowDecimal={false}
          defaultValue={props.sheet.abilities[key]}
          onBlur={event => edit({
            characterId: props.sheet.id,
            ability: key,
            score: readInt(event.currentTarget.value, props.sheet.abilities[key]),
          })}
        />
      ))}
    </Group>
  )
}

function readInt(value: string, fallback: number) {
  const next = Number(value)
  return Number.isFinite(next) ? Math.trunc(next) : fallback
}

function ConditionTrackers(props: { sheet: CharacterDto }) {
  const condition = useUnit(conditionToggled)
  return (
    <Stack gap="sm">
      <Divider label="Состояния" labelPosition="left" />
      <Group gap="xs">
        {conditionNames.map(name => (
          <Button
            key={name}
            size="xs"
            variant={props.sheet.conditions.includes(name) ? 'filled' : 'light'}
            onClick={() => condition({ characterId: props.sheet.id, name })}
          >
            {name}
          </Button>
        ))}
      </Group>
    </Stack>
  )
}

function SlotPips(props: { slots: CharacterDto['slots'] }) {
  if (props.slots.length === 0)
    return null
  return (
    <Stack gap={4}>
      <Text size="xs">Ячейки</Text>
      {props.slots.map(slot => (
        <Group key={slot.level} gap={4} align="center">
          <Text size="xs" w={12}>{String(slot.level)}</Text>
          {Array.from({ length: slot.max }, (_, index) => (
            <Box
              key={index}
              w={12}
              h={12}
              bg={index < slot.max - slot.spent ? 'blue.6' : 'dark.4'}
              style={{ borderRadius: 99 }}
            />
          ))}
        </Group>
      ))}
    </Stack>
  )
}

function HeroCard(props: { character: CharacterDto, tokenId: string | null, onOpen: (characterId: string) => void }) {
  const catalog = useUnit(catalogNames)
  const hero = props.character
  const klass = catalog[hero.classId] ?? 'Герой'
  return (
    <Paper withBorder radius="md" p="sm">
      <Group align="flex-start" wrap="nowrap" gap="sm">
        <Avatar
          src={hero.avatarUrl}
          alt={hero.name}
          name={hero.name}
          color="gray"
          variant="light"
          size={56}
          radius="md"
        />
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text fw={700} c="yellow.4" truncate="end" style={{ flex: 1, minWidth: 0 }}>{hero.name}</Text>
            <OwnerMark userId={hero.userId} />
          </Group>
          <HpBar current={hero.hpCurrent} max={hero.hpMax} temp={hero.hpTemp} />
          <Text size="xs" c="dimmed">{`${klass} ${hero.level}`}</Text>
          <Group gap="md">
            <Text size="xs">{`КД ${hero.ac}`}</Text>
            <Text size="xs">{`Скорость ${hero.speed}`}</Text>
            <Text size="xs">{`Сила ${hero.abilities.str}`}</Text>
          </Group>
          <Group justify="space-between" align="flex-end" wrap="nowrap">
            <HpAdjust tokenId={props.tokenId} characterId={hero.id} />
            <Button size="xs" variant="light" onClick={() => props.onOpen(hero.id)}>Лист</Button>
          </Group>
        </Stack>
      </Group>
    </Paper>
  )
}

function MobCard(props: { token: TokenDto, onOpen: (tokenId: string) => void, onRemove: (tokenId: string) => void }) {
  const token = props.token
  const dead = token.hpCurrent <= 0
  return (
    <Paper withBorder radius="md" p="sm">
      <Group align="flex-start" wrap="nowrap" gap="sm">
        <Avatar
          src={token.imageUrl}
          alt={token.name}
          name={token.name}
          color="gray"
          variant="light"
          size={56}
          radius="md"
        />
        <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Text fw={700} c={dead ? 'red' : 'yellow.4'} truncate="end">{token.name}</Text>
            {token.hidden && <Badge size="xs" variant="outline">скрыт</Badge>}
          </Group>
          <HpBar current={token.hpCurrent} max={token.hpMax} />
          <Group gap="md">
            {token.ac != null && <Text size="xs">{`КД ${token.ac}`}</Text>}
            {token.speed != null && <Text size="xs">{`Скорость ${token.speed}`}</Text>}
            {token.abilities && <Text size="xs">{`Сила ${token.abilities.str}`}</Text>}
          </Group>
          <Group justify="space-between" align="flex-end" wrap="nowrap">
            <HpAdjust tokenId={token.id} characterId={null} />
            <Group gap="xs" wrap="nowrap">
              <Button size="xs" variant="light" onClick={() => props.onOpen(token.id)}>Карточка</Button>
              <ActionIcon size="input-xs" variant="subtle" aria-label="Удалить моба" onClick={() => props.onRemove(token.id)}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Group>
        </Stack>
      </Group>
    </Paper>
  )
}

function percentLabel(value: number) {
  return `${value}%`
}

function attackDetail(attack: AttackDef) {
  const hit = attack.attackBonus > 0 ? `+${attack.attackBonus}` : String(attack.attackBonus)
  return `${hit} · ${attack.damageDice}${damageExtra(attack.damageBonus)} ${attack.damageType}`
}

function damageExtra(bonus: number) {
  if (bonus > 0)
    return `+${bonus}`
  if (bonus < 0)
    return String(bonus)
  return ''
}

function MapUpload() {
  const choose = useUnit(mapFileChosen)
  return (
    <FileButton
      accept="image/*"
      onChange={(file) => {
        if (file)
          choose(file)
      }}
    >
      {buttonProps => (
        <Stack gap={4}>
          <Button {...buttonProps} size="xs" variant="default">Загрузить карту</Button>
          <Text size="xs" c="dimmed">{`Файл хранится как есть, до ${imageLimitMb.map} МБ. PNG, JPG, WebP, GIF.`}</Text>
        </Stack>
      )}
    </FileButton>
  )
}
