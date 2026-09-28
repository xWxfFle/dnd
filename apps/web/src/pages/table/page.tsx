import type { AttackDef, CharacterDto } from '@dnd/shared'
import { isBloodied, isDeadFromExhaustion } from '@dnd/shared'
import { Accordion, ActionIcon, Avatar, Button, FileButton, Group, NumberInput, Paper, Popover, Select, Stack, Tabs, Text, Textarea, TextInput, Title } from '@mantine/core'
import { IconMinus, IconPlus, IconTrash } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { MapBoard } from '@/features/table-map/board'
import { ClassKit } from '@/pages/table/class-kit'
import { DiceTray } from '@/pages/table/dice-tray'
import { liveSnapshot } from '@/pages/table/live'
import { AccountMenu } from '@/shared/ui/account-menu'
import {
  attackRolled,
  avatars,
  campaignsOpened,
  cellSize,
  cellSizeChanged,
  characterOpened,
  characterPlacementToggled,
  columns,
  columnsChanged,
  combatAdvanced,
  combatEnded,
  combatStarted,
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
  monsterId,
  monsterPlaceRequested,
  monsters,
  monsterSelected,
  notes,
  notesChanged,
  notesSaveRequested,
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
  slotMarked,
  tokenHiddenToggled,
  tokenHpChanged,
  tokenMoved,
  tokenRemoved,
} from './model'

const sidePanel = { flex: 1, minHeight: 0, overflow: 'auto' } as const

export function TablePage() {
  const state = useUnit({
    snapshot: liveSnapshot,
    scene,
    dm,
    monsters,
    roster,
    sheets,
    avatars,
    sceneTokens,
    mapName,
    confirmDelete,
    monsterId,
    notes,
    columns,
    rows,
    cellSize,
    mapNameChanged,
    sceneSelected,
    sceneCreateRequested,
    sceneDeletePressed,
    gridPresetChosen,
    columnsChanged,
    rowsChanged,
    cellSizeChanged,
    gridApplyRequested,
    notesChanged,
    notesSaveRequested,
    monsterSelected,
    monsterPlaceRequested,
    campaignsOpened,
    characterOpened,
    combatStarted,
    combatAdvanced,
    combatEnded,
    slotMarked,
    tokenMoved,
    fogUpdated,
  })
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
  return (
    <Stack p="sm" gap="sm" h="100vh" style={{ overflow: 'hidden' }}>
      <Group justify="space-between">
        <div>
          <Title order={3}>{snapshot.campaign.name}</Title>
          <Text size="sm" c="dimmed">{state.dm ? 'Мастер' : 'Игрок'}</Text>
        </div>
        <Group>
          <AccountMenu />
          <Button size="sm" variant="default" onClick={() => void state.campaignsOpened()}>Кампании</Button>
          <Button size="sm" variant="light" onClick={() => void state.characterOpened()}>Персонаж</Button>
        </Group>
      </Group>
      <Text size="xs" c="dimmed">
        {window.location.hostname === 'localhost'
          ? `Приглашение: ${invite}. С localhost друзьям не зайти, нужен адрес из scripts/print-join-url.ps1 и код ${snapshot.campaign.inviteCode}.`
          : `Приглашение: ${invite}`}
      </Text>
      {state.dm && (
        <Group gap="xs" align="flex-end">
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
          <TextInput
            size="xs"
            aria-label="Новая карта"
            placeholder="Новая карта"
            value={state.mapName}
            onChange={event => state.mapNameChanged(event.currentTarget.value)}
          />
          <Button size="xs" disabled={state.mapName.trim().length === 0} onClick={() => void state.sceneCreateRequested()}>Создать</Button>
          <Button size="xs" variant={state.confirmDelete ? 'filled' : 'default'} disabled={!current} onClick={() => void state.sceneDeletePressed()}>
            {state.confirmDelete ? 'Точно удалить' : 'Удалить'}
          </Button>
          {current && (
            <Popover width={260} position="bottom-end" shadow="md">
              <Popover.Target>
                <Button size="xs" variant="default">Размер поля</Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="xs">
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
              </Popover.Dropdown>
            </Popover>
          )}
        </Group>
      )}
      <Group align="stretch" wrap="nowrap" gap="sm" style={{ flex: 1, minHeight: 0 }}>
        <Paper withBorder p={0} style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 8 }}>
            {current
              ? (
                  <MapBoard
                    scene={current}
                    tokens={state.sceneTokens}
                    dm={state.dm}
                    avatars={state.avatars}
                    onTokenMoved={state.tokenMoved}
                    onFogUpdated={fog => void state.fogUpdated({ sceneId: current.id, fog })}
                  />
                )
              : <Text>Нет сцены</Text>}
          </div>
        </Paper>
        <Tabs
          defaultValue={state.sheets.length > 0 ? 'sheet' : 'combat'}
          style={{ width: 420, flex: 'none', minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          <Tabs.List grow>
            <Tabs.Tab value="combat">Бой</Tabs.Tab>
            <Tabs.Tab value="dice">Кости</Tabs.Tab>
            {state.sheets.length > 0 && <Tabs.Tab value="sheet">Лист</Tabs.Tab>}
            {state.dm && <Tabs.Tab value="table">Стол</Tabs.Tab>}
          </Tabs.List>
          <Tabs.Panel value="combat" pt="sm" style={sidePanel}>
            <Stack gap="sm">
              {snapshot.combat
                ? snapshot.combat.combatants.map((combatant, index) => (
                    <Stack key={combatant.id} gap={0}>
                      <Text size="sm" fw={index === snapshot.combat?.activeIndex ? 700 : 500}>
                        {`${combatant.initiative}. ${combatant.name}`}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {`${combatant.hpCurrent}/${combatant.hpMax}${combatant.slotSpentThisTurn ? ' · ячейка потрачена' : ''}`}
                      </Text>
                    </Stack>
                  ))
                : <Text size="sm" c="dimmed">Бой не начат</Text>}
              {snapshot.combat && (
                <Button
                  size="xs"
                  variant="light"
                  disabled={snapshot.combat.combatants[snapshot.combat.activeIndex]?.slotSpentThisTurn}
                  onClick={() => void state.slotMarked()}
                >
                  Ячейка за ход
                </Button>
              )}
              {state.dm && current && (
                <Group gap="xs">
                  <Button size="xs" variant={snapshot.combat ? 'light' : 'filled'} onClick={() => void state.combatStarted()}>Начать</Button>
                  <Button size="xs" variant={snapshot.combat ? 'filled' : 'default'} disabled={!snapshot.combat} onClick={() => void state.combatAdvanced()}>Дальше</Button>
                  <Button size="xs" variant="default" disabled={!snapshot.combat} onClick={() => void state.combatEnded()}>Конец</Button>
                </Group>
              )}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="dice" pt="sm" style={sidePanel}>
            <DiceTray />
          </Tabs.Panel>
          {state.sheets.length > 0 && (
            <Tabs.Panel value="sheet" pt="sm" style={sidePanel}>
              <Stack gap="sm">
                {state.sheets.length === 1
                  ? (
                      <CharacterSheet
                        sheet={state.sheets[0]}
                        onMap={state.sceneTokens.some(token => token.characterId === state.sheets[0].id)}
                        sceneReady={Boolean(current)}
                      />
                    )
                  : (
                      <Accordion variant="separated" defaultValue={state.sheets[0].id}>
                        {state.sheets.map(character => (
                          <Accordion.Item key={character.id} value={character.id}>
                            <Accordion.Control>
                              {`${character.name} · ${character.hpCurrent}/${character.hpMax}`}
                            </Accordion.Control>
                            <Accordion.Panel>
                              <CharacterSheet
                                sheet={character}
                                onMap={state.sceneTokens.some(token => token.characterId === character.id)}
                                sceneReady={Boolean(current)}
                              />
                            </Accordion.Panel>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    )}
              </Stack>
            </Tabs.Panel>
          )}
          {state.dm && (
            <Tabs.Panel value="table" pt="sm" style={sidePanel}>
              <Stack gap="md">
                {state.roster.length > 0 && (
                  <Stack gap="sm">
                    <Text fw={700}>Персонажи</Text>
                    {state.roster.map(character => (
                      <CharacterPlace
                        key={character.id}
                        character={character}
                        placed={state.sceneTokens.some(token => token.characterId === character.id)}
                        sceneReady={Boolean(current)}
                      />
                    ))}
                  </Stack>
                )}
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
                    <Button size="xs" variant="light" onClick={() => void state.monsterPlaceRequested()}>На карту</Button>
                    <MonsterActions />
                    {state.sceneTokens.map(token => (
                      <TokenRow key={token.id} token={token} />
                    ))}
                    <Textarea label="Заметки мастера" value={state.notes} onChange={event => state.notesChanged(event.currentTarget.value)} minRows={3} />
                    <Group gap="xs">
                      <Button size="xs" variant="light" onClick={() => void state.notesSaveRequested()}>Сохранить заметки</Button>
                      <MapUpload />
                    </Group>
                  </Stack>
                )}
              </Stack>
            </Tabs.Panel>
          )}
        </Tabs>
      </Group>
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
  const { toggle, rest } = useUnit({
    toggle: characterPlacementToggled,
    rest: restRequested,
  })
  const sheet = props.sheet
  return (
    <Stack gap="md">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Avatar src={sheet.avatarUrl ?? undefined} alt="" size="lg" radius="xl" />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700}>{sheet.name}</Text>
          <Text size="sm">{`Хиты ${sheet.hpCurrent}/${sheet.hpMax}${isBloodied(sheet.hpCurrent, sheet.hpMax) ? ' · кровь' : ''}`}</Text>
          <Text size="sm">{`КД ${sheet.ac} · истощение ${sheet.exhaustion}${sheet.heroicInspiration ? ' · вдохновение' : ''}`}</Text>
          <Text size="sm">{`Смерть ${sheet.deathSaves.successes}/3 и ${sheet.deathSaves.failures}/3`}</Text>
        </Stack>
      </Group>
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
      <ClassKit sheet={sheet} />
      <SheetTrackers sheet={sheet} />
      <Group gap="xs">
        <Button size="xs" variant="light" onClick={() => rest({ characterId: sheet.id, kind: 'short' })}>Короткий отдых</Button>
        <Button size="xs" variant="default" onClick={() => rest({ characterId: sheet.id, kind: 'long' })}>Длинный отдых</Button>
      </Group>
    </Stack>
  )
}

function AttackRoll(props: { attack: AttackDef, exhaustion?: number }) {
  const roll = useUnit(attackRolled)
  const save = /сл\s*\d+/i.test(props.attack.damageType)
  const damage = props.attack.damageDice.includes('d')
  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>{props.attack.name}</Text>
      <Group gap="xs">
        {props.attack.attackBonus > 0 && (
          <Button size="xs" variant="light" onClick={() => roll({ attack: props.attack, kind: 'attack', exhaustion: props.exhaustion ?? 0 })}>Атака</Button>
        )}
        {save && (
          <Button size="xs" variant="default" onClick={() => roll({ attack: props.attack, kind: 'save', exhaustion: props.exhaustion ?? 0 })}>Спасбросок</Button>
        )}
        {damage && (
          <>
            <Button size="xs" variant="light" onClick={() => roll({ attack: props.attack, kind: 'damage' })}>Урон</Button>
            <Button size="xs" variant="default" onClick={() => roll({ attack: props.attack, kind: 'crit' })}>Крит</Button>
          </>
        )}
      </Group>
    </Stack>
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
      <Group gap="xs">
        <Button size="xs" variant="light" onClick={() => death({ characterId: props.sheet.id, kind: 'successes' })}>Успех смерти</Button>
        <Button size="xs" variant="default" onClick={() => death({ characterId: props.sheet.id, kind: 'failures' })}>Провал смерти</Button>
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

function MonsterActions() {
  const monster = useUnit(selectedMonster)
  const attacks = Array.isArray(monster?.body.attacks) ? monster.body.attacks as AttackDef[] : []
  return (
    <Stack gap={4} my="xs">
      {attacks.map(attack => <AttackRoll key={attack.id} attack={attack} />)}
    </Stack>
  )
}

function TokenRow(props: { token: { id: string, name: string, hpCurrent: number, hpMax: number, hidden: boolean } }) {
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
