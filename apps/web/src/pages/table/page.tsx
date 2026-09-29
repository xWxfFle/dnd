import type { AttackDef, CharacterDto, SrdEntryDto, TokenDto } from '@dnd/shared'
import { abilityModifier, isDeadFromExhaustion, readArmorClass } from '@dnd/shared'
import { Accordion, ActionIcon, Avatar, Badge, Box, Button, Collapse, CopyButton, Drawer, FileButton, Group, NumberInput, Paper, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconMinus, IconPlus, IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { useState } from 'react'
import { MapBoard } from '@/features/table-map/board'
import { AttackRoll } from '@/pages/table/attack-roll'
import { readAttacks } from '@/pages/table/attacks'
import { ClassKit } from '@/pages/table/class-kit'
import { CombatStrip, HpBar } from '@/pages/table/combat-strip'
import { DiceLog, DiceTray } from '@/pages/table/dice-tray'
import { liveSnapshot } from '@/pages/table/live'
import { AccountMenu } from '@/shared/ui/account-menu'
import {
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
  tokenHiddenToggled,
  tokenHpChanged,
  tokenMoved,
  tokenRemoved,
} from './model'
import { MonsterEdit } from './monster-edit'

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
  const openHero = (characterId: string) => {
    setTableOpen(false)
    setSheetId(characterId)
  }
  const openTable = () => {
    setSheetId(null)
    setTableOpen(true)
  }
  return (
    <Stack p="sm" gap="sm" h="100vh" style={{ overflow: 'hidden' }}>
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
        <Paper withBorder p={0} style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
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
        <Stack gap="sm" w={420} h="100%" style={{ flex: 'none', minHeight: 0, overflow: 'hidden' }}>
          <Paper withBorder p="sm" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Stack gap="sm">
              <SheetList sheets={state.sheets} onOpen={openHero} />
              <CombatStrip
                combat={snapshot.combat}
                dm={state.dm}
                tokens={state.sceneTokens}
                monsters={state.monsters}
                characters={snapshot.characters}
                onOpenSheet={openHero}
                onFocus={(id) => {
                  const token = state.sceneTokens.find(item => item.id === id)
                  if (!token)
                    return
                  setFocusToken({ x: token.x, y: token.y, tick: Date.now() })
                }}
              />
            </Stack>
          </Paper>
          <Paper withBorder p="sm" style={{ flex: 'none', maxHeight: '46%', overflow: 'auto' }}>
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
      <Drawer opened={openSheet != null} onClose={() => setSheetId(null)} position="right" title="Лист" size={420} padding="md">
        {state.sheets.length > 1 && (
          <Select
            mb="sm"
            size="xs"
            aria-label="Герой"
            data={state.sheets.map(item => ({ value: item.id, label: item.name }))}
            value={openSheet?.id ?? null}
            onChange={setSheetId}
            allowDeselect={false}
          />
        )}
        {openSheet && (
          <CharacterSheet
            sheet={openSheet}
            onMap={state.sceneTokens.some(token => token.characterId === openSheet.id)}
            sceneReady={Boolean(current)}
          />
        )}
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

function TableSetup() {
  const state = useUnit({
    scene,
    roster,
    sceneTokens,
    monsters,
    mapName,
    confirmDelete,
    monsterId,
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
    monsterSelected,
    characterOpened,
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
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={700}>Герои</Text>
          <Button size="xs" variant="light" onClick={() => void state.characterOpened()}>Новый</Button>
        </Group>
        {state.roster.map(character => (
          <CharacterPlace
            key={character.id}
            character={character}
            placed={state.sceneTokens.some(token => token.characterId === character.id)}
            sceneReady={Boolean(current)}
          />
        ))}
      </Stack>
      {current && (
        <Stack gap="sm">
          <Text fw={700}>Монстры</Text>
          <Select
            aria-label="Поиск монстра"
            placeholder="Поиск"
            searchable
            nothingFoundMessage="Нет такого монстра"
            data={state.monsters.map(monster => ({ value: monster.id, label: monster.name }))}
            value={state.monsterId}
            onChange={value => value && state.monsterSelected(value)}
            allowDeselect={false}
          />
          <MonsterStat />
          {state.sceneTokens.map(token => (
            <TokenRow
              key={token.id}
              token={token}
              monster={state.monsters.find(item => item.id === token.monsterId) ?? null}
            />
          ))}
          <MapUpload />
        </Stack>
      )}
    </Stack>
  )
}

function CharacterPlace(props: { character: CharacterDto, placed: boolean, sceneReady: boolean }) {
  const toggle = useUnit(characterPlacementToggled)
  return (
    <Stack gap={6}>
      <Group gap="xs" wrap="nowrap">
        <Avatar src={props.character.avatarUrl ?? undefined} alt="" size="sm" radius="xl" />
        <Text size="sm" style={{ flex: 1 }} lineClamp={1}>{props.character.name}</Text>
      </Group>
      <Group gap="xs">
        <Button size="xs" variant={props.placed ? 'default' : 'light'} disabled={!props.sceneReady} onClick={() => toggle(props.character.id)}>
          {props.placed ? 'Убрать' : 'На карту'}
        </Button>
        <PortraitUpload characterId={props.character.id} />
      </Group>
    </Stack>
  )
}

function CharacterSheet(props: { sheet: CharacterDto, onMap: boolean, sceneReady: boolean }) {
  const { toggle, rest, catalog } = useUnit({
    toggle: characterPlacementToggled,
    rest: restRequested,
    catalog: catalogNames,
  })
  const sheet = props.sheet
  return (
    <Stack gap="md">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Avatar src={sheet.avatarUrl ?? undefined} alt="" size="lg" radius="xl" />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700}>{sheet.name}</Text>
          <Text size="sm">{sheetTitle(sheet, catalog)}</Text>
          <Text size="sm">{`КД ${sheet.ac} · ${sheet.speed} фт · истощение ${sheet.exhaustion}${sheet.heroicInspiration ? ' · вдохновение' : ''}`}</Text>
        </Stack>
      </Group>
      <AbilityScores abilities={sheet.abilities} />
      <HpBar current={sheet.hpCurrent} max={sheet.hpMax} temp={sheet.hpTemp} />
      <Group gap="xs">
        <Button size="xs" variant={props.onMap ? 'default' : 'light'} disabled={!props.sceneReady} onClick={() => toggle(sheet.id)}>
          {props.onMap ? 'Убрать с карты' : 'На карту'}
        </Button>
        <PortraitUpload characterId={sheet.id} />
      </Group>
      <Stack gap="sm">
        {sheet.attacks.map(attack => (
          <AttackRoll key={attack.id} attack={attack} exhaustion={sheet.exhaustion} />
        ))}
      </Stack>
      <SlotPips slots={sheet.slots} />
      <Accordion variant="contained">
        <Accordion.Item value="kit">
          <Accordion.Control>Умения и заклинания</Accordion.Control>
          <Accordion.Panel>
            <ClassKit sheet={sheet} />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      <SheetTrackers sheet={sheet} />
      <Group gap="xs">
        <Button size="xs" variant="light" onClick={() => rest({ characterId: sheet.id, kind: 'short' })}>Короткий отдых</Button>
        <Button size="xs" variant="default" onClick={() => rest({ characterId: sheet.id, kind: 'long' })}>Длинный отдых</Button>
      </Group>
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
  const attacks = readAttacks(monster.body)
  return (
    <Stack gap={6}>
      <Text size="sm">{statLine(ac, hp, speed)}</Text>
      {attacks.map(attack => (
        <Text key={attack.id} size="xs">{attackLine(attack)}</Text>
      ))}
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

function attackLine(attack: AttackDef) {
  if (attack.attackBonus <= 0)
    return `${attack.name}: ${attack.damageType}`
  return `${attack.name} +${attack.attackBonus}, ${attack.damageDice}${damageExtra(attack.damageBonus)} ${attack.damageType}`
}

function damageExtra(bonus: number) {
  if (bonus > 0)
    return `+${bonus}`
  if (bonus < 0)
    return String(bonus)
  return ''
}

function TokenRow(props: { token: TokenDto, monster: SrdEntryDto | null }) {
  const { changeHp, toggleHidden, remove } = useUnit({
    changeHp: tokenHpChanged,
    toggleHidden: tokenHiddenToggled,
    remove: tokenRemoved,
  })
  const token = props.token
  return (
    <Stack gap={6}>
      <Text size="sm" lineClamp={1} c={token.hpCurrent <= 0 ? 'red' : undefined}>
        {`${token.name} ${token.hpCurrent}/${token.hpMax}${token.hpCurrent <= 0 ? ' · мёртв' : ''}`}
      </Text>
      <Group gap="xs">
        <ActionIcon size="sm" variant="default" aria-label="Урон" onClick={() => changeHp({ tokenId: token.id, delta: -1 })}>
          <IconMinus size={14} />
        </ActionIcon>
        <ActionIcon size="sm" variant="default" aria-label="Лечение" onClick={() => changeHp({ tokenId: token.id, delta: 1 })}>
          <IconPlus size={14} />
        </ActionIcon>
        <Button size="xs" variant="light" onClick={() => toggleHidden(token.id)}>{token.hidden ? 'Показать' : 'Скрыть'}</Button>
        <ActionIcon size="sm" variant="subtle" aria-label="Удалить фишку" onClick={() => remove(token.id)}>
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
      {token.characterId == null && <MonsterEdit token={token} monster={props.monster} />}
    </Stack>
  )
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
