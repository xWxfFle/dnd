import type { CharacterDto } from '@dnd/shared'
import { abilityLabel, abilityModifier, attackBonus, isDeadFromExhaustion, proficiencyBonus, skillLabel, spellSaveDc } from '@dnd/shared'
import { ActionIcon, Alert, Avatar, Badge, Button, FileButton, Group, NumberInput, Paper, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { useUnit } from '@virentia/react'
import { srdKitQuery } from '@/shared/api'
import { HpAdjust, HpBar } from './combat-strip'
import {
  catalogNames,
  characterPlacementToggled,
  deathSaveRecorded,
  exhaustionAdjusted,
  heroDeleteId,
  heroDeletePressed,
  heroNotesSaved,
  heroRenamed,
  hpMaxEdited,
  hpTempEdited,
  inspirationToggled,
  levelUpRequested,
  portraitChosen,
  sceneTokens,
} from './model'
import { OwnerControl } from './owner-mark'

const abilityShort = {
  str: 'Сил',
  dex: 'Лов',
  con: 'Тел',
  int: 'Инт',
  wis: 'Мдр',
  cha: 'Хар',
} as const satisfies Record<keyof CharacterDto['abilities'], string>

const abilityOrder = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

const pendingAlertByChoice = {
  asi: 'Выбери увеличение характеристик или черту.',
  subclass: 'Выбери подкласс.',
  feat: 'Выбери черту.',
} as const satisfies Record<NonNullable<CharacterDto['pendingChoice']>, string>

export function SheetOverview(props: {
  sheet: CharacterDto
  onMap: boolean
  sceneReady: boolean
  editable: boolean
  master: boolean
}) {
  const {
    catalog,
    tokens,
    renameHero,
    raiseLevel,
    editHpMax,
    editHpTemp,
    saveNotes,
    toggle,
    pendingHeroDelete,
    deleteHero,
  } = useUnit({
    catalog: catalogNames,
    tokens: sceneTokens,
    renameHero: heroRenamed,
    raiseLevel: levelUpRequested,
    editHpMax: hpMaxEdited,
    editHpTemp: hpTempEdited,
    saveNotes: heroNotesSaved,
    toggle: characterPlacementToggled,
    pendingHeroDelete: heroDeleteId,
    deleteHero: heroDeletePressed,
  })
  const sheet = props.sheet
  const tokenId = tokens.find(token => token.characterId === sheet.id)?.id ?? null
  const background = catalog[sheet.backgroundId] ?? '—'
  const bonus = proficiencyBonus(sheet.level)
  const pending = sheet.pendingChoice
  return (
    <Stack gap="sm">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Avatar key={sheet.avatarUrl ?? sheet.id} src={sheet.avatarUrl} alt={sheet.name} name={sheet.name} color="gray" variant="light" size="lg" radius="xl" />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {props.editable
            ? (
                <TextInput
                  key={`${sheet.id}:${sheet.name}`}
                  size="xs"
                  aria-label="Имя"
                  defaultValue={sheet.name}
                  onBlur={event => renameHero({ characterId: sheet.id, name: event.currentTarget.value })}
                />
              )
            : <Text fw={700}>{sheet.name}</Text>}
          <Text size="sm">{sheetTitle(sheet, catalog)}</Text>
          <OwnerControl characterId={sheet.id} userId={sheet.userId} />
          <Text size="sm">{`Предыстория: ${background}`}</Text>
          <Text size="sm">
            {`КД ${sheet.ac} · ${sheet.speed} фт · Владение +${bonus} · Кости хитов ${sheet.hitDiceRemaining}/${sheet.level} (${sheet.hitDie})`}
          </Text>
          {sheet.castingAbility && (
            <Text size="sm">
              {`СЛ ${spellSaveDc(sheet.abilities, sheet.castingAbility, sheet.level)} · атака заклинанием ${signedMod(attackBonus(sheet.abilities, sheet.castingAbility, sheet.level, true))}`}
            </Text>
          )}
          <Text size="sm">{`Навыки: ${namedList(sheet.skillProficiencies, skillLabel)}`}</Text>
          <Text size="sm">{`Спасброски: ${namedList(sheet.saveProficiencies, abilityLabel)}`}</Text>
          {props.editable && sheet.level < 20 && !pending && (
            <Button size="xs" variant="light" onClick={() => raiseLevel(sheet.id)}>Новый уровень</Button>
          )}
        </Stack>
      </Group>
      {pending && (
        <Alert color="yellow" title="Нужен выбор">
          {pendingAlertByChoice[pending]}
        </Alert>
      )}
      <AbilityStrip abilities={sheet.abilities} />
      <SheetFeats featIds={sheet.featIds} />
      <Stack gap={4}>
        <HpBar current={sheet.hpCurrent} max={sheet.hpMax} temp={sheet.hpTemp} />
        {props.editable && <HpAdjust tokenId={tokenId} characterId={sheet.id} />}
        {props.editable && (
          <Group gap="xs">
            <NumberInput
              key={`${sheet.id}:${sheet.hpTemp}`}
              size="xs"
              w={120}
              label="Временные хиты"
              min={0}
              max={999}
              hideControls
              allowDecimal={false}
              defaultValue={sheet.hpTemp}
              onBlur={event => editHpTemp({ characterId: sheet.id, hpTemp: readInt(event.currentTarget.value, sheet.hpTemp) })}
            />
            {props.master && (
              <NumberInput
                key={`${sheet.id}:${sheet.hpMax}`}
                size="xs"
                w={120}
                label="Максимум хитов"
                min={1}
                max={999}
                allowDecimal={false}
                defaultValue={sheet.hpMax}
                onBlur={event => editHpMax({ characterId: sheet.id, hpMax: readInt(event.currentTarget.value, sheet.hpMax) })}
              />
            )}
          </Group>
        )}
      </Stack>
      <CombatTrackers sheet={sheet} editable={props.editable} />
      {props.editable && (
        <Textarea
          key={`${sheet.id}:notes`}
          size="xs"
          label="Заметки"
          minRows={2}
          defaultValue={sheet.notes}
          onBlur={event => saveNotes({ characterId: sheet.id, notes: event.currentTarget.value })}
        />
      )}
      {props.editable && (
        <Group gap="xs">
          <Button size="xs" variant={props.onMap ? 'default' : 'light'} disabled={!props.sceneReady} onClick={() => toggle(sheet.id)}>
            {props.onMap ? 'Убрать с карты' : 'На карту'}
          </Button>
          <PortraitUpload characterId={sheet.id} />
          <Button size="xs" variant={pendingHeroDelete === sheet.id ? 'filled' : 'default'} onClick={() => deleteHero(sheet.id)}>
            {pendingHeroDelete === sheet.id ? 'Точно удалить' : 'Удалить героя'}
          </Button>
        </Group>
      )}
    </Stack>
  )
}

function SheetFeats(props: { featIds: string[] }) {
  const { kit, names } = useUnit({
    kit: srdKitQuery.data,
    names: catalogNames,
  })
  const catalog = kit ?? []
  const feats = props.featIds.flatMap((id) => {
    if (id === 'feat-ability-score-improvement')
      return []
    const entry = catalog.find(item => item.id === id)
    if (entry?.body.category === 'asi')
      return []
    const text = typeof entry?.body.text === 'string' ? entry.body.text : ''
    return [{ id, name: entry?.name ?? names[id] ?? id, text }]
  })
  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>Черты</Text>
      {feats.length === 0 && <Text size="sm" c="dimmed">Нет черт</Text>}
      {feats.map(feat => (
        <Paper key={feat.id} withBorder radius="md" p="xs">
          <Stack gap={4}>
            <Text size="sm" fw={600}>{feat.name}</Text>
            {feat.text
              ? <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>{feat.text}</Text>
              : null}
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}

function AbilityStrip(props: { abilities: CharacterDto['abilities'] }) {
  return (
    <SimpleGrid cols={6} spacing="xs">
      {abilityOrder.map(key => (
        <Stack key={key} gap={0} align="center">
          <Text size="xs" c="dimmed">{abilityShort[key]}</Text>
          <Text size="sm" fw={700}>{modifierText(props.abilities[key])}</Text>
          <Text size="xs">{String(props.abilities[key])}</Text>
        </Stack>
      ))}
    </SimpleGrid>
  )
}

function CombatTrackers(props: { sheet: CharacterDto, editable: boolean }) {
  const { inspire, exhaust, death } = useUnit({
    inspire: inspirationToggled,
    exhaust: exhaustionAdjusted,
    death: deathSaveRecorded,
  })
  const sheet = props.sheet
  return (
    <Stack gap="xs">
      <Group gap="xs">
        {props.editable
          ? (
              <Button size="xs" variant={sheet.heroicInspiration ? 'filled' : 'light'} onClick={() => inspire(sheet.id)}>
                Вдохновение
              </Button>
            )
          : (
              <Badge size="sm" variant={sheet.heroicInspiration ? 'filled' : 'outline'}>
                Вдохновение
              </Badge>
            )}
        <Text size="sm">{`Истощение ${sheet.exhaustion}`}</Text>
        {props.editable && (
          <>
            <Button size="xs" variant="default" aria-label="Истощение минус" onClick={() => exhaust({ characterId: sheet.id, delta: -1 })}>−</Button>
            <Button size="xs" variant="default" aria-label="Истощение плюс" onClick={() => exhaust({ characterId: sheet.id, delta: 1 })}>+</Button>
          </>
        )}
      </Group>
      {isDeadFromExhaustion(sheet.exhaustion) && <Text size="sm">Истощение 10: персонаж мёртв</Text>}
      <Group gap="xs" align="center">
        <Text size="xs">Успехи</Text>
        <SavePips
          filled={sheet.deathSaves.successes}
          label="Успех смерти"
          color="teal"
          editable={props.editable}
          onAdd={() => death({ characterId: sheet.id, kind: 'successes' })}
        />
        <Text size="xs">Провалы</Text>
        <SavePips
          filled={sheet.deathSaves.failures}
          label="Провал смерти"
          color="red"
          editable={props.editable}
          onAdd={() => death({ characterId: sheet.id, kind: 'failures' })}
        />
      </Group>
    </Stack>
  )
}

function SavePips(props: { filled: number, label: string, color: string, editable: boolean, onAdd: () => void }) {
  return (
    <Group gap={4}>
      {Array.from({ length: 3 }, (_, index) => {
        const marked = index < props.filled
        const next = index === props.filled
        const canAdd = props.editable && next
        return (
          <ActionIcon
            key={index}
            size="sm"
            variant={marked ? 'filled' : 'default'}
            color={marked ? props.color : undefined}
            aria-label={props.label}
            disabled={!canAdd}
            onClick={canAdd ? props.onAdd : undefined}
          />
        )
      })}
    </Group>
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

function namedList(ids: readonly string[], labels: Record<string, string>) {
  const names = ids.flatMap(id => labels[id] ? [labels[id]] : [])
  return names.length > 0 ? names.join(', ') : '—'
}

function sheetTitle(sheet: CharacterDto, catalog: Record<string, string>) {
  const klass = catalog[sheet.classId] ?? 'Герой'
  const subclass = catalog[sheet.subclassId]
  const species = catalog[sheet.speciesId]
  const klassLine = subclass ? `${klass} · ${subclass} ${sheet.level}` : `${klass} ${sheet.level}`
  return species ? `${klassLine} · ${species}` : klassLine
}

function modifierText(score: number) {
  return signedMod(abilityModifier(score))
}

function signedMod(value: number) {
  if (value > 0)
    return `+${value}`
  return String(value)
}

function readInt(value: string, fallback: number) {
  const next = Number(value)
  return Number.isFinite(next) ? Math.trunc(next) : fallback
}
