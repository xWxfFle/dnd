import type { AttackDef, CharacterDto } from '@dnd/shared'
import { abilityModifier, isDeadFromExhaustion, readArmorClass } from '@dnd/shared'
import { Accordion, ActionIcon, Avatar, Badge, Box, Button, Collapse, CopyButton, Divider, Drawer, FileButton, Group, NumberInput, Paper, Select, Stack, Tabs, Text, TextInput, Title } from '@mantine/core'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { MapBoard } from '@/features/table-map/board'
import { ClassKit } from '@/pages/table/class-kit'
import { CombatStrip, HpAdjust, HpBar } from '@/pages/table/combat-strip'
import { DiceLog, DiceTray } from '@/pages/table/dice-tray'
import { GearList } from '@/pages/table/gear-list'
import { liveSnapshot } from '@/pages/table/live'
import { SkillRolls } from '@/pages/table/skill-rolls'
import { AccountMenu } from '@/shared/ui/account-menu'
import {
  attackRolled,
  campaignsOpened,
  catalogNames,
  cellSize,
  cellSizeChanged,
  characterOpened,
  characterPlacementToggled,
  columns,
  columnsChanged,
  conditionNames,
  conditionToggled,
  confirmDelete,
  deathSaveRecorded,
  dm,
  exhaustionAdjusted,
  fieldPresets,
  fogUpdated,
  gridApplyRequested,
  gridPresetChosen,
  inspirationToggled,
  mapFileChosen,
  mapName,
  mapNameChanged,
  monsterCopies,
  monsterCopiesChanged,
  monsterId,
  monsterPlaceRequested,
  monsters,
  monsterSelected,
  portraitChosen,
  restRequested,
  roster,
  rows,
  rowsChanged,
  scene,
  sceneCreateRequested,
  sceneDeletePressed,
  sceneSelected,
  sceneTokens,
  selectedMonster,
  sheets,
  tokenMoved,
} from './model'
import { MonsterEdit } from './monster-edit'

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
    monsters,
    sheets,
    sceneTokens,
    sceneSelected,
    campaignsOpened,
    tokenMoved,
    fogUpdated,
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
    setTableOpen(false)
    setTokenId(null)
    setSheetId(currentId => currentId === characterId ? null : characterId)
  }
  const openCreature = (id: string) => {
    const token = state.sceneTokens.find(item => item.id === id)
    if (!token)
      return
    focusOn(id)
    setTableOpen(false)
    if (token.characterId) {
      setTokenId(null)
      setSheetId(currentId => currentId === token.characterId ? null : token.characterId)
      return
    }
    setSheetId(null)
    setTokenId(currentId => currentId === id ? null : id)
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
        <Group gap="xs" wrap="nowrap">
          <CopyButton value={invite}>
            {({ copied, copy }) => (
              <Button size="xs" variant="default" onClick={copy}>{copied ? 'Скопировано' : 'Ссылка'}</Button>
            )}
          </CopyButton>
          {state.dm && <Button size="xs" variant="light" onClick={openTable}>Стол</Button>}
          <AccountMenu />
        </Group>
      </Group>
      <Group align="stretch" wrap="nowrap" gap="sm" style={{ flex: 1, minHeight: 0 }}>
        <Stack gap="sm" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <Paper withBorder p={0} style={{ ...panelGlass, flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 8 }}>
              {current
                ? (
                    <MapBoard
                      scene={current}
                      tokens={state.sceneTokens}
                      dm={state.dm}
                      focusToken={focusToken}
                      onTokenMoved={state.tokenMoved}
                      onFogUpdated={fog => void state.fogUpdated({ sceneId: current.id, fog })}
                    />
                  )
                : <Text>Нет сцены</Text>}
            </div>
          </Paper>
          {(openSheet ?? openToken) && (
            <Paper withBorder p="sm" style={{ ...panelGlass, flex: 'none', height: '38%', minHeight: 220, overflow: 'auto' }}>
              {openToken
                ? (
                    <MonsterEdit
                      token={openToken}
                      monster={state.monsters.find(item => item.id === openToken.monsterId) ?? null}
                    />
                  )
                : openSheet && (
                  <Stack gap="sm">
                    {state.sheets.length > 1 && (
                      <Select
                        size="xs"
                        aria-label="Герой"
                        data={state.sheets.map(item => ({ value: item.id, label: item.name }))}
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
            <Tabs defaultValue="actors">
              <Tabs.List grow>
                <Tabs.Tab value="actors">Существа</Tabs.Tab>
                <Tabs.Tab value="combat">Бой</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="actors" pt="sm">
                {state.dm
                  ? <ActorsPanel onOpenHero={openHero} onOpenToken={openCreature} />
                  : <SheetList sheets={state.sheets} onOpen={openHero} />}
              </Tabs.Panel>
              <Tabs.Panel value="combat" pt="sm">
                <CombatStrip
                  combat={snapshot.combat}
                  dm={state.dm}
                  tokens={state.sceneTokens}
                  monsters={state.monsters}
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

function SheetList(props: { sheets: CharacterDto[], onOpen: (characterId: string) => void }) {
  if (props.sheets.length === 0)
    return null
  return (
    <Stack gap={4}>
      {props.sheets.map(sheet => (
        <Button key={sheet.id} size="xs" variant="subtle" fullWidth onClick={() => props.onOpen(sheet.id)}>
          {`${sheet.name} · ${sheet.hpCurrent}/${sheet.hpMax}`}
        </Button>
      ))}
    </Stack>
  )
}

function ActorsPanel(props: { onOpenHero: (characterId: string) => void, onOpenToken: (tokenId: string) => void }) {
  const state = useUnit({
    roster,
    sceneTokens,
    monsters,
    monsterId,
    scene,
    monsterSelected,
    characterOpened,
  })
  const [placeOpen, setPlaceOpen] = useState(false)
  const sceneReady = Boolean(state.scene)
  const mobs = state.sceneTokens.filter(token => token.characterId == null)
  return (
    <Stack gap="sm">
      <Group justify="flex-end" gap="xs">
        <Button size="xs" variant="light" onClick={() => void state.characterOpened()}>Новый герой</Button>
        <Button size="xs" variant="light" disabled={!sceneReady} onClick={() => setPlaceOpen(open => !open)}>Новый монстр</Button>
      </Group>
      {state.roster.map(character => (
        <Button key={character.id} size="xs" variant="subtle" fullWidth onClick={() => props.onOpenHero(character.id)}>
          {`${character.name} · ${character.hpCurrent}/${character.hpMax}`}
        </Button>
      ))}
      <Divider />
      {sceneReady && (
        <Collapse expanded={placeOpen}>
          <Stack gap="xs">
            <Select
              aria-label="Поиск монстра"
              placeholder="Поставить монстра"
              searchable
              nothingFoundMessage="Нет такого монстра"
              data={state.monsters.map(monster => ({ value: monster.id, label: monster.name }))}
              value={state.monsterId}
              onChange={value => value && state.monsterSelected(value)}
              allowDeselect={false}
            />
            <MonsterStat />
          </Stack>
        </Collapse>
      )}
      {mobs.map(token => (
        <Button key={token.id} size="xs" variant="subtle" fullWidth onClick={() => props.onOpenToken(token.id)} c={token.hpCurrent <= 0 ? 'red' : undefined}>
          {`${token.name} · ${token.hpCurrent}/${token.hpMax}${token.hpCurrent <= 0 ? ' · мёртв' : ''}`}
        </Button>
      ))}
    </Stack>
  )
}

function TableSetup() {
  const state = useUnit({
    scene,
    mapName,
    confirmDelete,
    columns,
    rows,
    cellSize,
    mapNameChanged,
    sceneCreateRequested,
    sceneDeletePressed,
    gridPresetChosen,
    columnsChanged,
    rowsChanged,
    cellSizeChanged,
    gridApplyRequested,
  })
  const current = state.scene
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
        <Stack gap="xs">
          <Text fw={700}>Размер поля</Text>
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
          <NumberInput size="xs" label="Клетка, px" min={8} max={256} allowDecimal={false} value={state.cellSize} onChange={state.cellSizeChanged} />
          <Button size="xs" onClick={() => void state.gridApplyRequested()}>Применить</Button>
        </Stack>
      )}
      {current && <MapUpload />}
    </Stack>
  )
}

function CharacterSheet(props: { sheet: CharacterDto, onMap: boolean, sceneReady: boolean }) {
  const { toggle, rest, catalog, rollAttack, tokens } = useUnit({
    toggle: characterPlacementToggled,
    rest: restRequested,
    catalog: catalogNames,
    rollAttack: attackRolled,
    tokens: sceneTokens,
  })
  const sheet = props.sheet
  const tokenId = tokens.find(token => token.characterId === sheet.id)?.id ?? null
  return (
    <Tabs defaultValue="overview" w="100%">
      <Tabs.List grow>
        <Tabs.Tab value="overview">Обзор</Tabs.Tab>
        <Tabs.Tab value="checks">Проверки</Tabs.Tab>
        <Tabs.Tab value="attacks">Атаки</Tabs.Tab>
        <Tabs.Tab value="gear">Снаряжение</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview" pt="sm">
        <Stack gap="sm" align="flex-start">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <Avatar src={sheet.avatarUrl ?? undefined} alt="" size="lg" radius="xl" />
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text fw={700}>{sheet.name}</Text>
              <Text size="sm">{sheetTitle(sheet, catalog)}</Text>
              <Text size="sm">{`КД ${sheet.ac} · ${sheet.speed} фт`}</Text>
            </Stack>
          </Group>
          <Stack gap={4} w={360}>
            <HpBar current={sheet.hpCurrent} max={sheet.hpMax} temp={sheet.hpTemp} />
            {tokenId && <HpAdjust tokenId={tokenId} />}
          </Stack>
          <Group gap="xs">
            <Button size="xs" variant={props.onMap ? 'default' : 'light'} disabled={!props.sceneReady} onClick={() => toggle(sheet.id)}>
              {props.onMap ? 'Убрать с карты' : 'На карту'}
            </Button>
            <PortraitUpload characterId={sheet.id} />
          </Group>
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="checks" pt="sm">
        <Stack gap="sm" align="flex-start">
          <AbilityScores abilities={sheet.abilities} />
          <SkillRolls sheet={sheet} />
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="attacks" pt="sm">
        <Stack gap="sm" align="flex-start">
          <Group align="flex-start" gap="sm">
            {sheet.attacks.map(attack => (
              <HeroAttack key={attack.id} attack={attack} exhaustion={sheet.exhaustion} onRoll={rollAttack} />
            ))}
          </Group>
          <SlotPips slots={sheet.slots} />
          <Accordion variant="contained" maw={520}>
            <Accordion.Item value="kit">
              <Accordion.Control>Умения и заклинания</Accordion.Control>
              <Accordion.Panel>
                <ClassKit sheet={sheet} />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="gear" pt="sm">
        <Stack gap="sm" align="flex-start">
          <GearList sheet={sheet} />
          <SheetTrackers sheet={sheet} />
          <Group gap="xs">
            <Button size="xs" variant="light" onClick={() => rest({ characterId: sheet.id, kind: 'short' })}>Короткий отдых</Button>
            <Button size="xs" variant="default" onClick={() => rest({ characterId: sheet.id, kind: 'long' })}>Длинный отдых</Button>
          </Group>
        </Stack>
      </Tabs.Panel>
    </Tabs>
  )
}

function HeroAttack(props: {
  attack: AttackDef
  exhaustion: number
  onRoll: (roll: { attack: AttackDef, kind: 'attack' | 'save', exhaustion: number }) => void
}) {
  const save = /сл\s*\d+/i.test(props.attack.damageType)
  const kind = save ? 'save' : 'attack'
  return (
    <Stack gap={4} w={260} align="flex-start">
      <Text size="sm" fw={600}>{props.attack.name}</Text>
      <Text size="xs" c="dimmed">{attackDetail(props.attack)}</Text>
      <Button size="xs" variant="default" onClick={() => props.onRoll({ attack: props.attack, kind, exhaustion: props.exhaustion })}>
        {save ? 'Спасбросок' : 'Бросок'}
      </Button>
    </Stack>
  )
}

const abilityLabel = {
  str: 'Сил',
  dex: 'Лов',
  con: 'Тел',
  int: 'Инт',
  wis: 'Мдр',
  cha: 'Хар',
} as const satisfies Record<keyof CharacterDto['abilities'], string>

const abilityOrder = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

function sheetTitle(sheet: CharacterDto, catalog: Record<string, string>) {
  const klass = catalog[sheet.classId] ?? 'Герой'
  const species = catalog[sheet.speciesId]
  return species ? `${klass} ${sheet.level} · ${species}` : `${klass} ${sheet.level}`
}

function modifierText(score: number) {
  const mod = abilityModifier(score)
  if (mod > 0)
    return `+${mod}`
  return String(mod)
}

function AbilityScores(props: { abilities: CharacterDto['abilities'] }) {
  return (
    <Group gap="xs" grow>
      {abilityOrder.map(key => (
        <Stack key={key} gap={0} align="center">
          <Text size="xs" c="dimmed">{abilityLabel[key]}</Text>
          <Text size="sm" fw={700}>{modifierText(props.abilities[key])}</Text>
          <Text size="xs">{String(props.abilities[key])}</Text>
        </Stack>
      ))}
    </Group>
  )
}

function SheetTrackers(props: { sheet: CharacterDto }) {
  const { inspire, exhaust, death, condition } = useUnit({
    inspire: inspirationToggled,
    exhaust: exhaustionAdjusted,
    death: deathSaveRecorded,
    condition: conditionToggled,
  })
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Button size="xs" variant={props.sheet.heroicInspiration ? 'filled' : 'light'} onClick={() => inspire(props.sheet.id)}>Вдохновение</Button>
        <Button size="xs" variant="default" onClick={() => exhaust({ characterId: props.sheet.id, delta: -1 })}>Истощение −</Button>
        <Button size="xs" variant="default" onClick={() => exhaust({ characterId: props.sheet.id, delta: 1 })}>Истощение +</Button>
      </Group>
      {isDeadFromExhaustion(props.sheet.exhaustion) && <Text size="sm">Истощение 10: персонаж мёртв</Text>}
      <Group gap="xs" align="center">
        <Text size="xs">Успехи</Text>
        <SavePips
          filled={props.sheet.deathSaves.successes}
          label="Успех смерти"
          color="teal"
          onAdd={() => death({ characterId: props.sheet.id, kind: 'successes' })}
        />
        <Text size="xs">Провалы</Text>
        <SavePips
          filled={props.sheet.deathSaves.failures}
          label="Провал смерти"
          color="red"
          onAdd={() => death({ characterId: props.sheet.id, kind: 'failures' })}
        />
      </Group>
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

function SavePips(props: { filled: number, label: string, color: string, onAdd: () => void }) {
  return (
    <Group gap={4}>
      {Array.from({ length: 3 }, (_, index) => {
        const marked = index < props.filled
        const next = index === props.filled
        return (
          <ActionIcon
            key={index}
            size="sm"
            variant={marked ? 'filled' : 'default'}
            color={marked ? props.color : undefined}
            aria-label={props.label}
            disabled={!marked && !next}
            onClick={next ? props.onAdd : undefined}
          />
        )
      })}
    </Group>
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

function MonsterStat() {
  const { monster, copies, changeCopies, place } = useUnit({
    monster: selectedMonster,
    copies: monsterCopies,
    changeCopies: monsterCopiesChanged,
    place: monsterPlaceRequested,
  })
  if (!monster)
    return null
  const ac = readArmorClass(monster.body)
  const hp = typeof monster.body.hp === 'number' ? monster.body.hp : null
  const speed = typeof monster.body.speed === 'number' ? monster.body.speed : null
  return (
    <Stack gap={6}>
      <Text size="sm">{statLine(ac, hp, speed)}</Text>
      <NumberInput size="xs" label="Сколько" min={1} max={12} allowDecimal={false} value={copies} onChange={changeCopies} />
      <Button size="xs" variant="light" onClick={() => void place()}>На карту</Button>
    </Stack>
  )
}

function statLine(ac: number | null, hp: number | null, speed: number | null) {
  const parts = [
    ac == null ? '' : `КД ${ac}`,
    hp == null ? '' : `${hp} хитов`,
    speed == null ? '' : `${speed} фт`,
  ].filter(part => part.length > 0)
  return parts.join(' · ')
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

function PortraitUpload(props: { characterId: string }) {
  const choose = useUnit(portraitChosen)
  return (
    <FileButton
      accept="image/*"
      onChange={(file) => {
        if (file)
          choose({ characterId: props.characterId, file })
      }}
    >
      {buttonProps => <Button {...buttonProps} size="xs" variant="default">Портрет</Button>}
    </FileButton>
  )
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
      {buttonProps => <Button {...buttonProps} size="xs" variant="default">Загрузить карту</Button>}
    </FileButton>
  )
}
