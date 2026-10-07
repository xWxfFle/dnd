import type { Abilities, Ability, AttackDef, CreatePresetInput, InventoryItem, KnownSpell, PendingChoice, SaveOverrides, Skill } from '@dnd/shared'
import { abilityLabel, abilityModifier, d20Formula, featuresForSheet, formatDiceFormula, imageLimitMb, imageTooLarge, parseDice, readAbilities, readArmorClass, readDiceFormula, readInventory, readSaveOverrides, saveBonus, skills, tokenSchema } from '@dnd/shared'
import { notifications } from '@mantine/notifications'
import { computed, effect, event, reaction, scoped, store } from '@virentia/core'
import { apiRead, apiSend, srdQuery } from '@/shared/api'
import { characterRoute, homeRoute, tableRoute } from '@/shared/routing'
import { appScope, readUserId } from '@/shared/session'
import { readAttacks } from './attacks'
import { liveSnapshot, sendLiveFx } from './live'

type CommandMethod = 'POST' | 'PATCH' | 'DELETE'
type AttackRollKind = 'attack' | 'save' | 'damage' | 'crit'
type CheckMode = 'advantage' | 'disadvantage'

export const fieldPresets = [
  { label: '15×10', columns: 15, rows: 10, cellSize: 48 },
  { label: '20×14', columns: 20, rows: 14, cellSize: 48 },
  { label: '30×20', columns: 30, rows: 20, cellSize: 40 },
] as const

export const conditionNames = ['ослеплён', 'испуган', 'отравлен', 'опутан', 'лежащий', 'без сознания'] as const

const commandFx = effect(async (command: { path: string, method: CommandMethod, body?: unknown }) => {
  await apiSend(command.path, command.method, command.body)
})

const uploadFx = effect(async (upload: { path: string, file: File, limitMb: number }) => {
  if (imageTooLarge(upload.file, upload.limitMb))
    throw new Error(oversizeMessage(upload.limitMb))
  const body = new FormData()
  body.set('file', upload.file)
  await apiSend(upload.path, 'POST', body)
})

export const scene = computed(() => {
  const snapshot = liveSnapshot.value
  if (!snapshot)
    return null
  return snapshot.scenes.find(item => item.active) ?? snapshot.scenes[0] ?? null
})

export const dm = computed(() => liveSnapshot.value?.campaign.role === 'dm')

export const viewerId = computed(() => readUserId())

export const monsters = computed(() => (srdQuery.data.value ?? []).filter(entry => entry.kind === 'monster'))

export const presets = computed(() => liveSnapshot.value?.presets ?? [])

export const roster = computed(() => {
  const snapshot = liveSnapshot.value
  return (snapshot?.characters ?? []).filter(character => character.kind === 'hero')
})

export const sheets = computed(() => {
  const userId = readUserId()
  return roster.value.slice().sort((left, right) => {
    if (left.userId === userId)
      return -1
    if (right.userId === userId)
      return 1
    return left.name.localeCompare(right.name, 'ru')
  })
})

export const catalogNames = computed(() => Object.fromEntries(
  (srdQuery.data.value ?? []).map(entry => [entry.id, entry.name]),
))

export const sceneTokens = computed(() => {
  const current = scene.value
  if (!current)
    return []
  return (liveSnapshot.value?.tokens ?? []).filter(token => token.sceneId === current.id)
})

export const mapName = store('')
export const confirmDelete = store(false)
export const heroDeleteId = store<string | null>(null)
export const monsterId = store('monster-goblin-warrior')
export const monsterCopies = store(1)
export const selectedMonster = computed(() => monsters.value.find(entry => entry.id === monsterId.value))
export const notes = store('')
export const columns = store(20)
export const rows = store(14)
export const cellSize = store(48)
export const gridKind = store<'square' | 'hex'>('square')
export const hexFacing = store<'pointy' | 'flat'>('pointy')
export const gridColor = store('#3a3348')
export const gridOpacity = store(1)
export const imageScale = store(1)
export const offsetX = store(0)
export const offsetY = store(0)
export const smoothing = store<'linear' | 'nearest'>('linear')
export const mapWidth = store(0)
export const mapHeight = store(0)
const gridKey = store('')
const mapSceneId = store<string | null>(null)
const notesSceneId = store<string | null>(null)

export const sheetRollModes = ['normal', 'advantage', 'disadvantage'] as const
export type SheetRollMode = (typeof sheetRollModes)[number]

export const diceFormula = store('1d20')
export const diceError = store('')
export const sheetRollMode = store<SheetRollMode>('normal')
export const parsedDice = computed(() => parseDice(diceFormula.value))
export const kitError = store<{ characterId: string, message: string } | null>(null)

export const mapNameChanged = event<string>()
export const sceneSelected = event<string>()
export const sceneCreateRequested = event<void>()
export const sceneDeletePressed = event<void>()
export const gridPresetChosen = event<(typeof fieldPresets)[number]>()
export const columnsChanged = event<string | number>()
export const rowsChanged = event<string | number>()
export const cellSizeChanged = event<string | number>()
export const gridKindChanged = event<string>()
export const hexFacingChanged = event<string>()
export const gridColorChanged = event<string>()
export const gridOpacityChanged = event<number>()
export const imageScaleChanged = event<number>()
export const offsetXChanged = event<string | number>()
export const offsetYChanged = event<string | number>()
export const smoothingChanged = event<string>()
export const mapMeasured = event<{ height: number, width: number }>()
export const gridApplyRequested = event<void>()
export const notesChanged = event<string>()
export const notesSaveRequested = event<void>()
export const monsterSelected = event<string>()
export const monsterCopiesChanged = event<string | number>()
export const monsterPlaceRequested = event<{ copies: number, image?: File }>()
export const characterPlacementToggled = event<string>()
export const heroDeletePressed = event<string>()
export const heroRenamed = event<{ characterId: string, name: string }>()
export const restRequested = event<{ characterId: string, kind: 'short' | 'long' }>()
export const inspirationToggled = event<string>()
export const exhaustionAdjusted = event<{ characterId: string, delta: number }>()
export const deathSaveRecorded = event<{ characterId: string, kind: 'successes' | 'failures' }>()
export const conditionToggled = event<{ characterId: string, name: string }>()
export const gearReplaced = event<{ characterId: string, inventory: InventoryItem[] }>()
export const portraitChosen = event<{ characterId: string, file: File }>()
export const levelUpRequested = event<string>()
export const abilityScoreEdited = event<{ characterId: string, ability: Ability, score: number }>()
export const hpMaxEdited = event<{ characterId: string, hpMax: number }>()
export const skillProficiencyToggled = event<{ characterId: string, skill: Skill }>()
export const presetSaved = event<CreatePresetInput>()
export const presetRemoved = event<string>()
export const presetSpawned = event<{ presetId: string, copies: number, image?: File }>()
export const blankMobPlaced = event<{
  name: string
  ac: number
  hp: number
  speed: number
  abilities: Abilities
  attacks: AttackDef[]
  copies: number
  image?: File
}>()
export const mapFileChosen = event<File>()
export const featureUsed = event<{ characterId: string, featureId: string }>()
export const resourceSpent = event<{ characterId: string, resourceId: string }>()
export const heroCreateRequested = event<void>()
export const heroNotesSaved = event<{ characterId: string, notes: string }>()
export const hpTempEdited = event<{ characterId: string, hpTemp: number }>()
export const levelChoiceSubmitted = event<{
  characterId: string
  body: { kind: PendingChoice, bonuses?: Partial<Abilities>, subclassId?: string, featId?: string }
}>()
export const spellCast = event<{ characterId: string, spellId: string }>()
export const spellsReplaced = event<{ characterId: string, spells: KnownSpell[] }>()
export const sheetHpChanged = event<{ characterId: string, delta: number }>()
export const attackRolled = event<{ attack: AttackDef, kind: AttackRollKind, exhaustion?: number }>()
export const strikeDeclared = event<{ attack: AttackDef, attackerTokenId: string, targetTokenId: string }>()
export const formulaChanged = event<string>()
export const dieAdded = event<number>()
export const bonusChanged = event<string | number>()
export const diceRollRequested = event<void>()
export const diceReset = event<void>()
export const checkRolled = event<CheckMode>()
export const sheetRollModeChosen = event<SheetRollMode>()
export const sheetCheckRolled = event<{ label: string, bonus: number, exhaustion: number }>()
export const campaignsOpened = event<void>()
export const combatStarted = event<void>()
export const combatAdvanced = event<void>()
export const combatEnded = event<void>()
export const slotMarked = event<void>()
export const tokenMoved = event<{ tokenId: string, x: number, y: number }>()
export const fogUpdated = event<{ sceneId: string, fog: { id: string, points: number[] }[] }>()
export const tokenHpChanged = event<{ tokenId: string, delta: number }>()
export const tokenHiddenToggled = event<string>()
export const tokenRemoved = event<string>()
export const tokenStatsSaved = event<{
  tokenId: string
  name: string
  hpMax: number
  ac: number
  speed: number
  attacks: AttackDef[]
  abilities: Abilities | null
  saves: SaveOverrides | null
  inventory: InventoryItem[]
}>()
export const monsterCheckRolled = event<{ tokenId: string, ability: Ability, kind: 'check' | 'save' }>()
export const tokenImageChosen = event<{ tokenId: string, file: File }>()

const checkLabelByMode = {
  advantage: 'Преимущество',
  disadvantage: 'Помеха',
} as const satisfies Record<CheckMode, string>

const combatMessageByEvent = {
  start: 'combat.start',
  next: 'combat.next',
  end: 'combat.end',
} as const

function damageOf(attack: AttackDef) {
  if (!attack.damageDice.includes('d'))
    return ''
  return `${attack.damageDice}${attack.damageBonus ? `+${attack.damageBonus}` : ''}`
}

const rollByKind = {
  attack: (attack: AttackDef, exhaustion?: number) => ({
    label: attack.name,
    formula: attack.attackBonus > 0 ? `1d20+${attack.attackBonus}` : '',
    mode: 'normal' as const,
    exhaustion: exhaustion ?? 0,
  }),
  save: (attack: AttackDef, exhaustion?: number) => ({
    label: attack.damageType,
    formula: '1d20',
    mode: 'normal' as const,
    exhaustion: exhaustion ?? 0,
  }),
  damage: (attack: AttackDef) => ({
    label: `${attack.name} урон`,
    formula: damageOf(attack),
    mode: 'normal' as const,
  }),
  crit: (attack: AttackDef) => ({
    label: `${attack.name} крит`,
    formula: damageOf(attack),
    mode: 'crit' as const,
  }),
} as const satisfies Record<AttackRollKind, (attack: AttackDef, exhaustion?: number) => { label: string, formula: string, mode: 'normal' | 'crit', exhaustion?: number }>

const blankMobAbilities: Abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

export function bootTableModel() {
  scoped(appScope, () => {
    reaction({
      on: liveSnapshot,
      run(snapshot) {
        if (!snapshot)
          return
        const current = snapshot.scenes.find(item => item.active) ?? snapshot.scenes[0]
        if (!current)
          return
        const nextKey = gridKeyOf(current.id, current.grid)
        if (gridKey.value !== nextKey) {
          gridKey.value = nextKey
          columns.value = current.grid.columns
          rows.value = current.grid.rows
          cellSize.value = current.grid.cellSize
          gridKind.value = kindOf(current.grid.kind)
          hexFacing.value = hexFacingOf(current.grid.hexFacing)
          gridColor.value = hexColor(current.grid.color)
          gridOpacity.value = clampNumber(current.grid.opacity ?? 1, 0, 1)
          imageScale.value = clampNumber(current.grid.imageScale ?? 1, 0.1, 8)
          offsetX.value = clampInt(current.grid.offsetX ?? 0, -4000, 4000)
          offsetY.value = clampInt(current.grid.offsetY ?? 0, -4000, 4000)
          smoothing.value = smoothingOf(current.grid.smoothing)
        }
        if (mapSceneId.value !== current.id) {
          mapSceneId.value = current.id
          mapWidth.value = 0
          mapHeight.value = 0
        }
        if (notesSceneId.value !== current.id) {
          notesSceneId.value = current.id
          notes.value = current.dmNotes ?? ''
        }
      },
    })
    reaction({
      on: mapNameChanged,
      run(value) {
        mapName.value = value
      },
    })
    reaction({
      on: notesChanged,
      run(value) {
        notes.value = value.slice(0, 20000)
      },
    })
    reaction({
      on: monsterSelected,
      run(value) {
        monsterId.value = value
      },
    })
    reaction({
      on: monsterCopiesChanged,
      run(value) {
        monsterCopies.value = clampInt(readCount(value, monsterCopies.value), 1, 12)
      },
    })
    reaction({
      on: columnsChanged,
      run(value) {
        columns.value = readCount(value, columns.value)
      },
    })
    reaction({
      on: rowsChanged,
      run(value) {
        rows.value = readCount(value, rows.value)
      },
    })
    reaction({
      on: cellSizeChanged,
      run(value) {
        cellSize.value = readCount(value, cellSize.value)
      },
    })
    reaction({
      on: gridKindChanged,
      run(value) {
        gridKind.value = kindOf(value)
      },
    })
    reaction({
      on: hexFacingChanged,
      run(value) {
        hexFacing.value = hexFacingOf(value)
      },
    })
    reaction({
      on: gridColorChanged,
      run(value) {
        gridColor.value = value.slice(0, 7)
      },
    })
    reaction({
      on: gridOpacityChanged,
      run(value) {
        gridOpacity.value = clampNumber(value, 0, 1)
      },
    })
    reaction({
      on: imageScaleChanged,
      run(value) {
        imageScale.value = clampNumber(value, 0.1, 8)
      },
    })
    reaction({
      on: offsetXChanged,
      run(value) {
        offsetX.value = clampInt(readCount(value, offsetX.value), -4000, 4000)
      },
    })
    reaction({
      on: offsetYChanged,
      run(value) {
        offsetY.value = clampInt(readCount(value, offsetY.value), -4000, 4000)
      },
    })
    reaction({
      on: smoothingChanged,
      run(value) {
        smoothing.value = smoothingOf(value)
      },
    })
    reaction({
      on: mapMeasured,
      run(size) {
        mapWidth.value = size.width
        mapHeight.value = size.height
      },
    })
    reaction({
      on: formulaChanged,
      run(value) {
        diceFormula.value = value
      },
    })
    reaction({
      on: sceneSelected,
      run(sceneId) {
        confirmDelete.value = false
        const base = campaignBase()
        if (!base)
          return
        void commandFx({ path: `${base}/scenes/${sceneId}`, method: 'PATCH', body: { active: true } })
      },
    })
    reaction({
      on: sceneCreateRequested,
      run() {
        const name = mapName.value.trim()
        const base = campaignBase()
        if (!name || !base)
          return
        mapName.value = ''
        void commandFx({ path: `${base}/scenes`, method: 'POST', body: { name } })
      },
    })
    reaction({
      on: sceneDeletePressed,
      run() {
        const current = scene.value
        const base = campaignBase()
        if (!current || !base)
          return
        if (!confirmDelete.value) {
          confirmDelete.value = true
          return
        }
        confirmDelete.value = false
        void commandFx({ path: `${base}/scenes/${current.id}`, method: 'DELETE' })
      },
    })
    reaction({
      on: gridPresetChosen,
      run(preset) {
        const current = scene.value
        const base = campaignBase()
        if (!current || !base)
          return
        columns.value = preset.columns
        rows.value = preset.rows
        cellSize.value = preset.cellSize
        const grid = gridBody()
        gridKey.value = gridKeyOf(current.id, grid)
        void commandFx({
          path: `${base}/scenes/${current.id}`,
          method: 'PATCH',
          body: { grid },
        })
      },
    })
    reaction({
      on: gridApplyRequested,
      run() {
        const current = scene.value
        const base = campaignBase()
        if (!current || !base)
          return
        const grid = gridBody()
        columns.value = grid.columns
        rows.value = grid.rows
        cellSize.value = grid.cellSize
        gridKind.value = grid.kind
        hexFacing.value = grid.hexFacing
        gridColor.value = grid.color
        gridOpacity.value = grid.opacity
        imageScale.value = grid.imageScale
        offsetX.value = grid.offsetX
        offsetY.value = grid.offsetY
        smoothing.value = grid.smoothing
        gridKey.value = gridKeyOf(current.id, grid)
        void commandFx({ path: `${base}/scenes/${current.id}`, method: 'PATCH', body: { grid } })
      },
    })
    reaction({
      on: notesSaveRequested,
      run() {
        const current = scene.value
        const base = campaignBase()
        if (!current || !base || notesSceneId.value !== current.id)
          return
        void commandFx({ path: `${base}/scenes/${current.id}`, method: 'PATCH', body: { dmNotes: notes.value } })
      },
    })
    reaction({
      on: monsterPlaceRequested,
      async run({ copies, image }) {
        const monster = selectedMonster.value
        if (!monster)
          return
        const hp = Number(monster.body.hp ?? 1)
        await stampMobTokens({
          name: monster.name,
          hp: Number.isFinite(hp) ? hp : 1,
          copies,
          image,
          ...placedMonster(monster.body),
        })
      },
    })
    reaction({
      on: characterPlacementToggled,
      run(characterId) {
        const snapshot = liveSnapshot.value
        const current = scene.value
        if (!snapshot || !current)
          return
        const placed = snapshot.tokens.some(token => token.sceneId === current.id && token.characterId === characterId)
        void commandFx({
          path: `/api/campaigns/${snapshot.campaign.id}/scenes/${current.id}/characters/${characterId}`,
          method: placed ? 'DELETE' : 'POST',
        })
      },
    })
    reaction({
      on: heroDeletePressed,
      run(characterId) {
        const base = campaignBase()
        if (!base)
          return
        if (heroDeleteId.value !== characterId) {
          heroDeleteId.value = characterId
          return
        }
        heroDeleteId.value = null
        void commandFx({ path: `${base}/characters/${characterId}`, method: 'DELETE' })
      },
    })
    reaction({
      on: heroRenamed,
      run({ characterId, name }) {
        const next = name.trim().slice(0, 80)
        const sheet = characterById(characterId)
        if (!next || !sheet || next === sheet.name)
          return
        patchCharacter(characterId, { name: next })
      },
    })
    reaction({
      on: restRequested,
      run({ characterId, kind }) {
        const base = campaignBase()
        if (!base)
          return
        void commandFx({ path: `${base}/characters/${characterId}/rest`, method: 'POST', body: { kind } })
      },
    })
    reaction({
      on: inspirationToggled,
      run(characterId) {
        const sheet = characterById(characterId)
        if (!sheet)
          return
        patchCharacter(characterId, { heroicInspiration: !sheet.heroicInspiration })
      },
    })
    reaction({
      on: exhaustionAdjusted,
      run({ characterId, delta }) {
        const sheet = characterById(characterId)
        if (!sheet)
          return
        patchCharacter(characterId, { exhaustion: Math.min(10, Math.max(0, sheet.exhaustion + delta)) })
      },
    })
    reaction({
      on: deathSaveRecorded,
      run({ characterId, kind }) {
        const sheet = characterById(characterId)
        if (!sheet)
          return
        patchCharacter(characterId, {
          deathSaves: { ...sheet.deathSaves, [kind]: Math.min(3, sheet.deathSaves[kind] + 1) },
        })
      },
    })
    reaction({
      on: conditionToggled,
      run({ characterId, name }) {
        const sheet = characterById(characterId)
        if (!sheet)
          return
        const active = sheet.conditions.includes(name)
        patchCharacter(characterId, {
          conditions: active ? sheet.conditions.filter(item => item !== name) : [...sheet.conditions, name],
        })
      },
    })
    reaction({
      on: gearReplaced,
      run({ characterId, inventory }) {
        if (!characterById(characterId))
          return
        patchCharacter(characterId, { inventory: inventory.slice(0, 40) })
      },
    })
    reaction({
      on: spellsReplaced,
      run({ characterId, spells }) {
        if (!characterById(characterId))
          return
        patchCharacter(characterId, { spells: spells.slice(0, 80) })
      },
    })
    reaction({
      on: sheetHpChanged,
      run({ characterId, delta }) {
        const sheet = characterById(characterId)
        if (!sheet || (!dm.value && sheet.userId !== viewerId.value))
          return
        const hpCurrent = Math.min(sheet.hpMax, Math.max(0, sheet.hpCurrent + Math.trunc(delta)))
        patchCharacter(characterId, { hpCurrent })
      },
    })
    reaction({
      on: portraitChosen,
      run({ characterId, file }) {
        const base = campaignBase()
        if (!base)
          return
        void uploadFx({ path: `${base}/characters/${characterId}/avatar`, file, limitMb: imageLimitMb.portrait })
      },
    })
    reaction({
      on: levelUpRequested,
      run(characterId) {
        const base = campaignBase()
        const sheet = characterById(characterId)
        if (!base || !sheet || sheet.level >= 20 || sheet.pendingChoice)
          return
        void commandFx({ path: `${base}/characters/${characterId}/level`, method: 'POST' })
      },
    })
    reaction({
      on: abilityScoreEdited,
      run({ characterId, ability, score }) {
        const sheet = characterById(characterId)
        if (!sheet || !dm.value)
          return
        const next = Math.min(30, Math.max(1, Math.trunc(score)))
        patchCharacter(characterId, { abilities: { ...sheet.abilities, [ability]: next } })
      },
    })
    reaction({
      on: hpMaxEdited,
      run({ characterId, hpMax }) {
        if (!dm.value)
          return
        patchCharacter(characterId, { hpMax: Math.min(999, Math.max(1, Math.trunc(hpMax))) })
      },
    })
    reaction({
      on: skillProficiencyToggled,
      run({ characterId, skill }) {
        const sheet = characterById(characterId)
        if (!sheet || !dm.value || !skills.includes(skill))
          return
        const active = sheet.skillProficiencies.includes(skill)
        patchCharacter(characterId, {
          skillProficiencies: active
            ? sheet.skillProficiencies.filter(item => item !== skill)
            : [...sheet.skillProficiencies, skill],
        })
      },
    })
    reaction({
      on: presetSaved,
      run(body) {
        const base = campaignBase()
        if (!base || !dm.value)
          return
        void commandFx({ path: `${base}/presets`, method: 'POST', body })
      },
    })
    reaction({
      on: presetRemoved,
      run(presetId) {
        const base = campaignBase()
        if (!base || !dm.value)
          return
        void commandFx({ path: `${base}/presets/${presetId}`, method: 'DELETE' })
      },
    })
    reaction({
      on: presetSpawned,
      async run({ presetId, copies, image }) {
        const preset = presets.value.find(item => item.id === presetId)
        if (!preset || !dm.value)
          return
        await stampMobTokens({
          name: preset.name,
          hp: preset.hp,
          ac: preset.ac,
          speed: preset.speed,
          attacks: preset.attacks,
          abilities: preset.abilities,
          saves: preset.saves,
          color: preset.color,
          copies,
          image,
        })
      },
    })
    reaction({
      on: blankMobPlaced,
      async run(stamp) {
        if (!dm.value)
          return
        await stampMobTokens({
          name: stamp.name.trim(),
          hp: stamp.hp,
          ac: stamp.ac,
          speed: stamp.speed,
          attacks: stamp.attacks,
          abilities: stamp.abilities,
          copies: stamp.copies,
          image: stamp.image,
        })
      },
    })
    reaction({
      on: mapFileChosen,
      run(file) {
        const current = scene.value
        const base = campaignBase()
        if (!current || !base)
          return
        void uploadFx({ path: `${base}/scenes/${current.id}/map`, file, limitMb: imageLimitMb.map })
      },
    })
    reaction({
      on: heroCreateRequested,
      run() {
        const id = tableRoute.params.value.id
        if (!id)
          return
        void characterRoute.open({ params: { id } })
      },
    })
    reaction({
      on: heroNotesSaved,
      run({ characterId, notes }) {
        patchCharacter(characterId, { notes: notes.slice(0, 20000) })
      },
    })
    reaction({
      on: hpTempEdited,
      run({ characterId, hpTemp }) {
        patchCharacter(characterId, { hpTemp: Math.max(0, Math.trunc(hpTemp)) })
      },
    })
    reaction({
      on: resourceSpent,
      run({ characterId, resourceId }) {
        const sheet = characterById(characterId)
        if (!sheet)
          return
        const pool = sheet.classResources.find(item => item.id === resourceId)
        if (!pool || pool.spent >= pool.max) {
          kitError.value = { characterId, message: 'Нет зарядов' }
          return
        }
        kitError.value = null
        patchCharacter(characterId, {
          classResources: sheet.classResources.map(item => item.id === resourceId ? { ...item, spent: item.spent + 1 } : item),
        })
      },
    })
    reaction({
      on: levelChoiceSubmitted,
      run({ characterId, body }) {
        const base = campaignBase()
        if (!base)
          return
        void commandFx({ path: `${base}/characters/${characterId}/choice`, method: 'POST', body })
      },
    })
    reaction({
      on: featureUsed,
      run({ characterId, featureId }) {
        const sheet = characterById(characterId)
        if (!sheet)
          return
        const feature = featuresForSheet(sheet.classId, sheet.subclassId, sheet.level).find(item => item.id === featureId)
        if (!feature)
          return
        kitError.value = null
        if (feature.formula) {
          void sendLiveFx({ type: 'roll', label: feature.name, formula: feature.formula, mode: 'normal' })
          return
        }
        const active = sheet.featureToggles.includes(feature.id)
        const pool = sheet.classResources.find(item => item.id === feature.id || item.id === `${feature.id}s` || item.id.startsWith(feature.id))
        if (!active && pool && pool.spent >= pool.max) {
          kitError.value = { characterId, message: 'Нет зарядов' }
          return
        }
        const classResources = !active && pool
          ? sheet.classResources.map(item => item.id === pool.id ? { ...item, spent: item.spent + 1 } : item)
          : sheet.classResources
        patchCharacter(characterId, {
          featureToggles: active
            ? sheet.featureToggles.filter(item => item !== feature.id)
            : [...sheet.featureToggles, feature.id],
          classResources,
        })
      },
    })
    reaction({
      on: spellCast,
      run({ characterId, spellId }) {
        const sheet = characterById(characterId)
        const known = sheet?.spells.find(item => item.id === spellId)
        const spell = (srdQuery.data.value ?? []).find(entry => entry.id === spellId)
        if (!sheet || (!known && !spell))
          return
        const level = known?.level ?? Number(spell?.body.level ?? 0)
        const dice = known?.dice || (typeof spell?.body.dice === 'string' ? spell.body.dice : '')
        if (level > 0) {
          const slots = sheet.slots.map(slot => ({ ...slot }))
          const slot = slots.find(item => item.level >= level && item.spent < item.max)
          if (!slot) {
            kitError.value = { characterId, message: 'Нет свободной ячейки' }
            return
          }
          slot.spent += 1
          kitError.value = null
          patchCharacter(characterId, { slots })
        }
        else {
          kitError.value = null
        }
        if (dice.includes('d'))
          void sendLiveFx({ type: 'roll', label: known?.name ?? spell?.name ?? 'Заклинание', formula: dice, mode: 'normal' })
      },
    })
    reaction({
      on: attackRolled,
      run({ attack, kind, exhaustion }) {
        const message = rollByKind[kind](attack, exhaustion)
        if (message.formula)
          void sendLiveFx({ type: 'roll', ...message })
      },
    })
    reaction({
      on: strikeDeclared,
      run(strike) {
        void sendLiveFx({ type: 'strike', ...strike })
      },
    })
    reaction({
      on: dieAdded,
      run(sides) {
        const parsed = parseDice(diceFormula.value)
        const diceCount = parsed.dice.reduce((sum, term) => sum + term.count, 0)
        if (diceCount >= 40)
          return
        const existing = parsed.dice.find(term => term.sign === 1 && term.sides === sides)
        const dice = existing
          ? parsed.dice.map(term => term === existing ? { ...term, count: term.count + 1 } : term)
          : [...parsed.dice, { count: 1, sides, sign: 1 as const }]
        diceFormula.value = formatDiceFormula(dice, parsed.bonus)
        diceError.value = ''
      },
    })
    reaction({
      on: bonusChanged,
      run(value) {
        const parsed = parseDice(diceFormula.value)
        const next = typeof value === 'number' ? value : Number(value)
        if (!Number.isFinite(next) || parsed.dice.length === 0)
          return
        const bonus = Math.max(-100, Math.min(100, Math.trunc(next)))
        diceFormula.value = formatDiceFormula(parsed.dice, bonus)
        diceError.value = ''
      },
    })
    reaction({
      on: diceRollRequested,
      run() {
        const read = readDiceFormula(diceFormula.value)
        if (!read) {
          diceError.value = 'Формула вроде 2d6+1d8+3'
          return
        }
        diceError.value = ''
        diceFormula.value = read.formula
        void sendLiveFx({ type: 'roll', label: read.formula, formula: read.formula, mode: 'normal' })
      },
    })
    reaction({
      on: diceReset,
      run() {
        diceFormula.value = ''
        diceError.value = ''
      },
    })
    reaction({
      on: checkRolled,
      run(mode) {
        void sendLiveFx({ type: 'roll', label: checkLabelByMode[mode], formula: '1d20', mode })
      },
    })
    reaction({
      on: sheetRollModeChosen,
      run(mode) {
        sheetRollMode.value = mode
      },
    })
    reaction({
      on: sheetCheckRolled,
      run(check) {
        void sendLiveFx({
          type: 'roll',
          label: check.label,
          formula: d20Formula(check.bonus),
          mode: sheetRollMode.value,
          exhaustion: check.exhaustion,
        })
      },
    })
    reaction({
      on: campaignsOpened,
      run() {
        void homeRoute.open({})
      },
    })
    reaction({
      on: combatStarted,
      run() {
        sendCombat('start')
      },
    })
    reaction({
      on: combatAdvanced,
      run() {
        sendCombat('next')
      },
    })
    reaction({
      on: combatEnded,
      run() {
        sendCombat('end')
      },
    })
    reaction({
      on: slotMarked,
      run() {
        const combat = liveSnapshot.value?.combat
        const active = combat?.combatants[combat.activeIndex]
        if (active && !active.slotSpentThisTurn)
          void sendLiveFx({ type: 'slot', combatantId: active.id })
      },
    })
    reaction({
      on: tokenMoved,
      run(move) {
        void sendLiveFx({ type: 'move', ...move })
      },
    })
    reaction({
      on: fogUpdated,
      run({ sceneId, fog }) {
        const snapshot = liveSnapshot.value
        if (snapshot) {
          liveSnapshot.value = {
            ...snapshot,
            scenes: snapshot.scenes.map(item => item.id === sceneId ? { ...item, fog } : item),
          }
        }
        void sendLiveFx({ type: 'fog', sceneId, fog })
      },
    })
    reaction({
      on: tokenHpChanged,
      run({ tokenId, delta }) {
        void sendLiveFx({ type: 'hp', tokenId, delta })
      },
    })
    reaction({
      on: tokenHiddenToggled,
      run(tokenId) {
        const token = liveSnapshot.value?.tokens.find(item => item.id === tokenId)
        if (token)
          void sendLiveFx({ type: 'token.hide', tokenId, hidden: !token.hidden })
      },
    })
    reaction({
      on: tokenRemoved,
      run(tokenId) {
        void sendLiveFx({ type: 'token.delete', tokenId })
      },
    })
    reaction({
      on: monsterCheckRolled,
      run({ tokenId, ability, kind }) {
        const token = liveSnapshot.value?.tokens.find(item => item.id === tokenId)
        if (!token?.abilities)
          return
        const bonusByKind = {
          check: abilityModifier(token.abilities[ability]),
          save: saveBonus(token.abilities, token.saves ?? {}, ability),
        } as const
        const labelByKind = {
          check: abilityLabel[ability],
          save: `Спас ${abilityLabel[ability]}`,
        } as const
        void sendLiveFx({
          type: 'roll',
          label: labelByKind[kind],
          formula: d20Formula(bonusByKind[kind]),
          mode: sheetRollMode.value,
        })
      },
    })
    reaction({
      on: tokenStatsSaved,
      run(patch) {
        const base = campaignBase()
        if (!base)
          return
        const { tokenId, ...body } = patch
        void commandFx({ path: `${base}/tokens/${tokenId}`, method: 'PATCH', body })
      },
    })
    reaction({
      on: tokenImageChosen,
      run({ tokenId, file }) {
        const base = campaignBase()
        if (!base)
          return
        void uploadFx({ path: `${base}/tokens/${tokenId}/image`, file, limitMb: imageLimitMb.portrait })
      },
    })
    reaction({
      on: uploadFx.failData,
      run(error) {
        showUploadError(error instanceof Error ? error.message : 'Не удалось загрузить файл')
      },
    })
  })
}

function oversizeMessage(limitMb: number) {
  return `Файл больше ${limitMb} МБ`
}

function showUploadError(message: string) {
  notifications.show({ color: 'red', title: 'Картинка не загружена', message })
}

function campaignBase() {
  const id = liveSnapshot.value?.campaign.id
  return id ? `/api/campaigns/${id}` : null
}

function characterById(characterId: string) {
  return liveSnapshot.value?.characters.find(item => item.id === characterId) ?? null
}

function patchCharacter(characterId: string, body: Record<string, unknown>) {
  const base = campaignBase()
  if (!base)
    return
  void commandFx({ path: `${base}/characters/${characterId}`, method: 'PATCH', body })
}

function sendCombat(kind: keyof typeof combatMessageByEvent) {
  const current = scene.value
  if (!current)
    return
  void sendLiveFx({ type: combatMessageByEvent[kind], sceneId: current.id })
}

function placedMonster(body: Record<string, unknown>) {
  const speed = typeof body.speed === 'number' ? body.speed : 30
  return {
    ac: readArmorClass(body) ?? 10,
    speed,
    attacks: readAttacks(body),
    abilities: readAbilities(body.abilities) ?? blankMobAbilities,
    saves: readSaveOverrides(body.saves),
    inventory: readInventory(body.inventory),
  }
}

async function stampMobTokens(stamp: {
  name: string
  hp: number
  ac: number
  speed: number
  attacks: AttackDef[]
  abilities: Abilities | null
  saves?: SaveOverrides | null
  inventory?: InventoryItem[]
  color?: string
  copies: number
  image?: File
}) {
  const current = scene.value
  const base = campaignBase()
  const name = stamp.name.trim()
  if (!current || !base || !name)
    return
  // Проверяем до создания фишек, иначе часть копий встанет без картинки, а ошибка всплывёт на каждую.
  if (stamp.image && imageTooLarge(stamp.image, imageLimitMb.portrait)) {
    showUploadError(oversizeMessage(imageLimitMb.portrait))
    return
  }
  const count = Math.min(12, Math.max(1, Math.trunc(stamp.copies)))
  const names = copyNames(name, sceneTokens.value, count)
  for (const [index, label] of names.entries()) {
    const created = await apiRead(`${base}/scenes/${current.id}/tokens`, tokenSchema, 'POST', {
      name: label,
      x: 1 + (index % 8),
      y: 1 + Math.floor(index / 8),
      hpCurrent: stamp.hp,
      hpMax: stamp.hp,
      hidden: false,
      color: stamp.color,
      ac: stamp.ac,
      speed: stamp.speed,
      attacks: stamp.attacks,
      abilities: stamp.abilities,
      saves: stamp.saves ?? null,
      inventory: stamp.inventory ?? [],
    })
    if (!stamp.image)
      continue
    await uploadFx({ path: `${base}/tokens/${created.id}/image`, file: stamp.image, limitMb: imageLimitMb.portrait })
  }
}

function copyNames(base: string, tokens: { name: string }[], count: number) {
  const taken = new Set<number>()
  for (const token of tokens) {
    if (token.name === base)
      continue
    if (!token.name.startsWith(`${base} `))
      continue
    const match = token.name.slice(base.length).match(/^ (\d+)$/)
    if (match)
      taken.add(Number(match[1]))
  }
  const names: string[] = []
  let number = 1
  while (names.length < count) {
    if (!taken.has(number))
      names.push(`${base} ${number}`)
    number += 1
  }
  return names
}

const kindByValue: Record<string, 'square' | 'hex' | undefined> = {
  hex: 'hex',
  square: 'square',
}

function kindOf(value: string | undefined) {
  return kindByValue[value ?? ''] ?? 'square'
}

const hexFacingByValue: Record<string, 'pointy' | 'flat' | undefined> = {
  flat: 'flat',
  pointy: 'pointy',
}

function hexFacingOf(value: string | undefined) {
  return hexFacingByValue[value ?? ''] ?? 'pointy'
}

const smoothingByValue: Record<string, 'linear' | 'nearest' | undefined> = {
  linear: 'linear',
  nearest: 'nearest',
}

function smoothingOf(value: string | undefined) {
  return smoothingByValue[value ?? ''] ?? 'linear'
}

function hexColor(value: string | undefined) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#3a3348'
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value))
    return min
  return Math.min(max, Math.max(min, value))
}

function gridBody() {
  return {
    cellSize: clampInt(cellSize.value, 8, 256),
    color: hexColor(gridColor.value),
    columns: clampInt(columns.value, 1, 200),
    imageScale: clampNumber(imageScale.value, 0.1, 8),
    hexFacing: hexFacing.value,
    kind: gridKind.value,
    offsetX: clampInt(offsetX.value, -4000, 4000),
    offsetY: clampInt(offsetY.value, -4000, 4000),
    opacity: clampNumber(gridOpacity.value, 0, 1),
    rows: clampInt(rows.value, 1, 200),
    smoothing: smoothing.value,
  }
}

function gridKeyOf(sceneId: string, grid: {
  cellSize: number
  color?: string
  columns: number
  imageScale?: number
  hexFacing?: string
  kind?: string
  offsetX?: number
  offsetY?: number
  opacity?: number
  rows: number
  smoothing?: string
}) {
  return `${sceneId}:${grid.columns}:${grid.rows}:${grid.cellSize}:${kindOf(grid.kind)}:${hexFacingOf(grid.hexFacing)}:${hexColor(grid.color)}:${clampNumber(grid.opacity ?? 1, 0, 1)}:${clampNumber(grid.imageScale ?? 1, 0.1, 8)}:${clampInt(grid.offsetX ?? 0, -4000, 4000)}:${clampInt(grid.offsetY ?? 0, -4000, 4000)}:${smoothingOf(grid.smoothing)}`
}

function readCount(value: string | number, fallback: number) {
  const next = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(next) ? Math.trunc(next) : fallback
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)))
}
