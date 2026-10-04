import { createCharacterSchema, restSchema, updateCharacterSchema } from '@dnd/shared'
import { eq, inArray } from 'drizzle-orm'
import { status } from 'elysia'
import { db } from '../../db'
import { characters, combatants, tokens } from '../../db/schema'
import { deleteToken } from '../../lib/combat'
import { applyRest, createCharacter, gearFields, toCharacterDto } from '../../lib/table'
import { rejectUnlessImage, uploadName, writeUpload } from '../../lib/uploads'
import { broadcast } from '../../live/hub'
import { campaignRoutes } from '../../plugins/campaign-access'
import { characterParams, idParams, imageBody } from '../params'

async function renamePlaced(characterId: string, name: string) {
  const placed = await db.update(tokens).set({ name }).where(eq(tokens.characterId, characterId)).returning({ id: tokens.id })
  const ids = placed.map(row => row.id)
  if (ids.length === 0)
    return
  await db.update(combatants).set({ name }).where(inArray(combatants.tokenId, ids))
}

async function loadCharacter(campaignId: string, characterId: string, userId: string, role: 'dm' | 'player') {
  const [current] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1)
  if (!current || current.campaignId !== campaignId || (role !== 'dm' && current.userId !== userId))
    return null
  return current
}

export const charactersModule = campaignRoutes('campaign-characters')
  .get('/:id/characters', async ({ params, role }) => {
    const rows = await db.select().from(characters).where(eq(characters.campaignId, params.id))
    const visible = role === 'dm' ? rows : rows.filter(row => row.kind !== 'custom')
    return visible.map(toCharacterDto)
  }, {
    member: true,
    params: idParams,
  })
  .post('/:id/characters', async ({ userId, params, body }) => {
    const character = await createCharacter({ ...body, campaignId: params.id, userId })
    if (!character)
      return status(422, { error: 'Класс, вид, предыстория или навыки не сходятся' })
    await broadcast(params.id)
    return character
  }, {
    member: true,
    params: idParams,
    body: createCharacterSchema,
  })
  .delete('/:id/characters/:characterId', async ({ userId, params, role }) => {
    const current = await loadCharacter(params.id, params.characterId, userId, role)
    if (!current)
      return status(404, { error: 'Not found' })
    const placed = await db.select().from(tokens).where(eq(tokens.characterId, params.characterId))
    for (const token of placed)
      await deleteToken(token.id)
    await db.delete(characters).where(eq(characters.id, params.characterId))
    await broadcast(params.id)
    return { ok: true }
  }, {
    member: true,
    params: characterParams,
  })
  .patch('/:id/characters/:characterId', async ({ userId, params, body, role }) => {
    const current = await loadCharacter(params.id, params.characterId, userId, role)
    if (!current)
      return status(404, { error: 'Not found' })
    const { kind, name, ...rest } = body
    const patch: typeof rest & { kind?: 'hero' | 'custom', name?: string } = { ...rest }
    if (kind && role === 'dm' && current.userId === userId)
      patch.kind = kind
    if (name != null) {
      const trimmed = name.trim().slice(0, 80)
      if (trimmed.length === 0)
        return status(422, { error: 'Пустое имя' })
      patch.name = trimmed
    }
    const next = patch.inventory ? { ...patch, ...gearFields(current, patch.inventory) } : patch
    const [updated] = await db.update(characters).set(next).where(eq(characters.id, params.characterId)).returning()
    if (patch.name && patch.name !== current.name)
      await renamePlaced(params.characterId, patch.name)
    await broadcast(params.id)
    return toCharacterDto(updated)
  }, {
    member: true,
    params: characterParams,
    body: updateCharacterSchema,
  })
  .post('/:id/characters/:characterId/rest', async ({ userId, params, body, role }) => {
    const current = await loadCharacter(params.id, params.characterId, userId, role)
    if (!current)
      return status(404, { error: 'Not found' })
    const character = await applyRest(params.characterId, body.kind)
    await broadcast(params.id)
    return character
  }, {
    member: true,
    params: characterParams,
    body: restSchema,
  })
  .post('/:id/characters/:characterId/avatar', async ({ userId, params, body, role }) => {
    const [current] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    if (!current || current.campaignId !== params.id)
      return status(404, { error: 'Not found' })
    if (role !== 'dm' && current.userId !== userId)
      return status(403, { error: 'Чужой персонаж' })
    const rejected = await rejectUnlessImage(body.file, 'Нужен файл портрета')
    if (rejected)
      return rejected
    const storagePath = await writeUpload(`avatar-${params.characterId}-${uploadName(body.file.name)}`, body.file)
    await db.update(characters).set({ avatarPath: storagePath }).where(eq(characters.id, params.characterId))
    await broadcast(params.id)
    return { ok: true }
  }, {
    member: true,
    params: characterParams,
    body: imageBody,
  })
