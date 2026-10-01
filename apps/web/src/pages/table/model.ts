import type { Abilities, Ability, AttackDef, InventoryItem, SaveOverrides } from '@dnd/shared'
import { abilityLabel, abilityModifier, d20Formula, formatDiceFormula, gearByItemId, parseDice, readAbilities, readArmorClass, readClassFeatures, readDiceFormula, readSaveOverrides, saveBonus } from '@dnd/shared'
import { computed, effect, event, reaction, scoped, store } from '@virentia/core'
import { apiSend, srdQuery } from '@/shared/api'
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

export const scene = computed(() => {
  const snapshot = liveSnapshot.value
  if (!snapshot)
    return null
  return snapshot.scenes.find(item => item.active) ?? snapshot.scenes[0] ?? null
})

export const dm = computed(() => liveSnapshot.value?.campaign.role === 'dm')

export const monsters = computed(() => (srdQuery.data.value ?? []).filter(entry => entry.kind === 'monster'))

export const roster = computed(() => {
  const snapshot = liveSnapshot.value
  if (!snapshot)
    return []
  if (snapshot.campaign.role === 'dm')
    return snapshot.characters
  const userId = readUserId()
  return snapshot.characters.filter(character => character.userId === userId)
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
export const monsterId = store('monster-goblin-warrior')
export const monsterCopies = store(1)
export const selectedMonster = computed(() => monsters.value.find(entry => entry.id === monsterId.value))
export const notes = store('')
export const columns = store(20)
export const rows = store(14)
export const cellSize = store(48)
const gridKey = store('')
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
export const gridApplyRequested = event<void>()
export const notesChanged = event<string>()
export const notesSaveRequested = event<void>()
export const monsterSelected = event<string>()
export const monsterCopiesChanged = event<string | number>()
export const monsterPlaceRequested = event<void>()
export const characterPlacementToggled = event<string>()
export const restRequested = event<{ characterId: string, kind: 'short' | 'long' }>()
export const inspirationToggled = event<string>()
export const exhaustionAdjusted = event<{ characterId: string, delta: number }>()
export const deathSaveRecorded = event<{ characterId: string, kind: 'successes' | 'failures' }>()
export const conditionToggled = event<{ characterId: string, name: string }>()
export const gearToggled = event<{ characterId: string, id: string }>()
export const gearAdded = event<{ characterId: string, itemId: string }>()
export const gearRemoved = event<{ characterId: string, id: string }>()
export const portraitChosen = event<{ characterId: string, file: File }>()
export const mapFileChosen = event<File>()
export const featureUsed = event<{ characterId: string, featureId: string }>()
export const spellCast = event<{ characterId: string, spellId: string }>()
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
export const characterOpened = event<void>()
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
        const nextKey = `${current.id}:${current.grid.columns}:${current.grid.rows}:${current.grid.cellSize}`
        if (gridKey.value !== nextKey) {
          gridKey.value = nextKey
          columns.value = current.grid.columns
          rows.value = current.grid.rows
          cellSize.value = current.grid.cellSize
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
        notes.value = value
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
        gridKey.value = `${current.id}:${preset.columns}:${preset.rows}:${preset.cellSize}`
        void commandFx({
          path: `${base}/scenes/${current.id}`,
          method: 'PATCH',
          body: { grid: { columns: preset.columns, rows: preset.rows, cellSize: preset.cellSize } },
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
        const grid = {
          columns: clampInt(columns.value, 1, 200),
          rows: clampInt(rows.value, 1, 200),
          cellSize: clampInt(cellSize.value, 8, 256),
        }
        columns.value = grid.columns
        rows.value = grid.rows
        cellSize.value = grid.cellSize
        gridKey.value = `${current.id}:${grid.columns}:${grid.rows}:${grid.cellSize}`
        void commandFx({ path: `${base}/scenes/${current.id}`, method: 'PATCH', body: { grid } })
      },
    })
    reaction({
      on: notesSaveRequested,
      run() {
        const current = scene.value
        const base = campaignBase()
        if (!current || !base)
          return
        void commandFx({ path: `${base}/scenes/${current.id}`, method: 'PATCH', body: { dmNotes: notes.value } })
      },
    })
    reaction({
      on: monsterPlaceRequested,
      async run() {
        const current = scene.value
        const base = campaignBase()
        const monster = selectedMonster.value
        if (!current || !base || !monster)
          return
        const hp = Number(monster.body.hp ?? 1)
        const names = copyNames(monster.name, sceneTokens.value, monster.id, monsterCopies.value)
        for (const [index, name] of names.entries()) {
          await commandFx({
            path: `${base}/scenes/${current.id}/tokens`,
            method: 'POST',
            body: {
              name,
              x: 1 + (index % 8),
              y: 1 + Math.floor(index / 8),
              hpCurrent: hp,
              hpMax: hp,
              monsterId: monster.id,
              hidden: false,
              ...placedMonster(monster.body),
            },
          })
        }
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
      on: gearToggled,
      run({ characterId, id }) {
        const sheet = characterById(characterId)
        const current = sheet?.inventory.find(item => item.id === id)
        if (!sheet || !current || current.kind === 'gear')
          return
        patchCharacter(characterId, {
          inventory: sheet.inventory.map(item => ({
            ...item,
            equipped: equippedAfterToggle(item, current, !current.equipped),
          })),
        })
      },
    })
    reaction({
      on: gearAdded,
      run({ characterId, itemId }) {
        const sheet = characterById(characterId)
        const gear = gearByItemId(itemId)
        if (!sheet || !gear)
          return
        patchCharacter(characterId, {
          inventory: [...sheet.inventory, {
            id: crypto.randomUUID(),
            itemId,
            name: gear.name,
            quantity: 1,
            kind: gear.stats.kind,
            equipped: false,
          }],
        })
      },
    })
    reaction({
      on: gearRemoved,
      run({ characterId, id }) {
        const sheet = characterById(characterId)
        if (!sheet)
          return
        patchCharacter(characterId, {
          inventory: sheet.inventory.filter(item => item.id !== id || item.kind === 'gear'),
        })
      },
    })
    reaction({
      on: portraitChosen,
      run({ characterId, file }) {
        const base = campaignBase()
        if (!base)
          return
        const body = new FormData()
        body.set('file', file)
        void commandFx({ path: `${base}/characters/${characterId}/avatar`, method: 'POST', body })
      },
    })
    reaction({
      on: mapFileChosen,
      run(file) {
        const current = scene.value
        const base = campaignBase()
        if (!current || !base)
          return
        const body = new FormData()
        body.set('file', file)
        void commandFx({ path: `${base}/scenes/${current.id}/map`, method: 'POST', body })
      },
    })
    reaction({
      on: featureUsed,
      run({ characterId, featureId }) {
        const sheet = characterById(characterId)
        if (!sheet)
          return
        const classEntry = (srdQuery.data.value ?? []).find(entry => entry.id === sheet.classId)
        const feature = classEntry ? readClassFeatures(classEntry.body).find(item => item.id === featureId) : undefined
        if (!feature)
          return
        kitError.value = null
        if (feature.formula) {
          void sendLiveFx({ type: 'roll', label: feature.name, formula: feature.formula, mode: 'normal' })
          return
        }
        const active = sheet.conditions.includes(feature.name)
        patchCharacter(characterId, {
          conditions: active ? sheet.conditions.filter(item => item !== feature.name) : [...sheet.conditions, feature.name],
        })
      },
    })
    reaction({
      on: spellCast,
      run({ characterId, spellId }) {
        const sheet = characterById(characterId)
        const spell = (srdQuery.data.value ?? []).find(entry => entry.id === spellId)
        if (!sheet || !spell)
          return
        const level = Number(spell.body.level ?? 0)
        const dice = typeof spell.body.dice === 'string' ? spell.body.dice : ''
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
          void sendLiveFx({ type: 'roll', label: spell.name, formula: dice, mode: 'normal' })
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
      on: characterOpened,
      run() {
        const id = tableRoute.params.value.id
        if (id)
          void characterRoute.open({ params: { id } })
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
        const body = new FormData()
        body.set('file', file)
        void commandFx({ path: `${base}/tokens/${tokenId}/image`, method: 'POST', body })
      },
    })
  })
}

function campaignBase() {
  const id = liveSnapshot.value?.campaign.id
  return id ? `/api/campaigns/${id}` : null
}

function equippedAfterToggle(item: { id: string, kind: string, equipped: boolean }, current: { id: string, kind: string }, equipped: boolean) {
  if (item.id === current.id)
    return equipped
  if (equipped && item.kind === current.kind && (current.kind === 'armor' || current.kind === 'shield'))
    return false
  return item.equipped
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
    abilities: readAbilities(body.abilities),
    saves: readSaveOverrides(body.saves),
  }
}

function copyNames(base: string, tokens: { name: string, monsterId: string | null }[], monsterId: string, count: number) {
  const taken = new Set<number>()
  for (const token of tokens) {
    if (token.monsterId !== monsterId && !token.name.startsWith(`${base} `) && token.name !== base)
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

function readCount(value: string | number, fallback: number) {
  const next = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(next) ? Math.trunc(next) : fallback
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)))
}
