import { createSceneSchema, createTokenSchema, fogPolygonSchema, hpSchema, moveTokenSchema, updateSceneSchema, updateTokenSchema } from '@dnd/shared'
import { eq } from 'drizzle-orm'
import { status } from 'elysia'
import { z } from 'zod'
import { db } from '../../db'
import { characters, scenes, tokens } from '../../db/schema'
import { activateScene, changeTokenHp, deleteScene, endCombat, moveToken, placeCharacterToken, removeCharacterToken, replaceFog, setTokenHidden, startCombat, updateTokenStats } from '../../lib/combat'
import { toSceneDto, toTokenDto } from '../../lib/table'
import { rejectUnlessImage, uploadName, writeUpload } from '../../lib/uploads'
import { broadcast } from '../../live/hub'
import { campaignRoutes } from '../../plugins/campaign-access'
import { idParams, imageBody, sceneCharacterParams, sceneParams, tokenParams } from '../params'

const hiddenSchema = z.object({ hidden: z.boolean() })

const fogBodySchema = z.object({
  fog: z.array(fogPolygonSchema).optional(),
})

const dmOnly = 'Только мастер'

export const scenesModule = campaignRoutes('campaign-scenes')
  .post('/:id/scenes', async ({ params, body }) => {
    await db.update(scenes).set({ active: false }).where(eq(scenes.campaignId, params.id))
    const [scene] = await db.insert(scenes).values({
      campaignId: params.id,
      name: body.name,
      grid: { columns: 20, rows: 14, cellSize: 48 },
      fog: [],
      active: true,
    }).returning()
    await broadcast(params.id)
    return toSceneDto(scene, 'dm')
  }, {
    dm: dmOnly,
    params: idParams,
    body: createSceneSchema,
  })
  .patch('/:id/scenes/:sceneId', async ({ params, body }) => {
    if (body.active)
      await activateScene(params.id, params.sceneId)
    const patch: Record<string, unknown> = {}
    if (body.name)
      patch.name = body.name
    if (body.grid)
      patch.grid = body.grid
    if (body.fog)
      patch.fog = body.fog
    if (body.dmNotes != null)
      patch.dmNotes = body.dmNotes
    const [scene] = Object.keys(patch).length
      ? await db.update(scenes).set(patch).where(eq(scenes.id, params.sceneId)).returning()
      : await db.select().from(scenes).where(eq(scenes.id, params.sceneId)).limit(1)
    await broadcast(params.id)
    return toSceneDto(scene, 'dm')
  }, {
    dm: dmOnly,
    params: sceneParams,
    body: updateSceneSchema,
  })
  .delete('/:id/scenes/:sceneId', async ({ params }) => {
    const scene = await deleteScene(params.id, params.sceneId)
    if (!scene)
      return status(404, { error: 'Нет карты' })
    await broadcast(params.id)
    return { ok: true }
  }, {
    dm: dmOnly,
    params: sceneParams,
  })
  .post('/:id/scenes/:sceneId/characters/:characterId', async ({ userId, params, role }) => {
    const [character] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, params.sceneId)).limit(1)
    if (!character || !scene || character.campaignId !== params.id || scene.campaignId !== params.id)
      return status(404, { error: 'Not found' })
    if (role !== 'dm' && character.userId !== userId)
      return status(403, { error: 'Чужой персонаж' })
    const token = await placeCharacterToken(params.sceneId, character)
    await broadcast(params.id)
    return toTokenDto(token)
  }, {
    member: true,
    params: sceneCharacterParams,
  })
  .delete('/:id/scenes/:sceneId/characters/:characterId', async ({ userId, params, role }) => {
    const [character] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    if (!character || character.campaignId !== params.id)
      return status(404, { error: 'Not found' })
    if (role !== 'dm' && character.userId !== userId)
      return status(403, { error: 'Чужой персонаж' })
    const token = await removeCharacterToken(params.sceneId, params.characterId)
    if (!token)
      return status(404, { error: 'Персонажа нет на карте' })
    await broadcast(params.id)
    return { ok: true }
  }, {
    member: true,
    params: sceneCharacterParams,
  })
  .post('/:id/scenes/:sceneId/map', async ({ params, body }) => {
    const rejected = await rejectUnlessImage(body.file, 'Нужен файл карты')
    if (rejected)
      return rejected
    const storagePath = await writeUpload(`${params.sceneId}-${uploadName(body.file.name)}`, body.file)
    await db.update(scenes).set({ imagePath: storagePath }).where(eq(scenes.id, params.sceneId))
    await broadcast(params.id)
    return { ok: true }
  }, {
    dm: dmOnly,
    params: sceneParams,
    body: imageBody,
  })
  .post('/:id/scenes/:sceneId/tokens', async ({ params, body }) => {
    const [token] = await db.insert(tokens).values({
      sceneId: params.sceneId,
      name: body.name,
      x: body.x,
      y: body.y,
      size: body.size,
      hpCurrent: body.hpCurrent,
      hpMax: body.hpMax,
      hidden: body.hidden,
      characterId: body.characterId ?? null,
      monsterId: body.monsterId ?? null,
      color: body.color,
      ac: body.ac ?? null,
      speed: body.speed ?? null,
      attacks: body.attacks ?? [],
    }).returning()
    await broadcast(params.id)
    return toTokenDto(token)
  }, {
    dm: dmOnly,
    params: sceneParams,
    body: createTokenSchema,
  })
  .patch('/:id/tokens/:tokenId', async ({ params, body }) => {
    const token = await updateTokenStats(params.tokenId, body)
    if (!token)
      return status(404, { error: 'Not found' })
    await broadcast(params.id)
    return toTokenDto(token)
  }, {
    dm: dmOnly,
    params: tokenParams,
    body: updateTokenSchema,
  })
  .post('/:id/tokens/:tokenId/image', async ({ params, body }) => {
    const rejected = await rejectUnlessImage(body.file, 'Нужна картинка')
    if (rejected)
      return rejected
    const [current] = await db.select().from(tokens).where(eq(tokens.id, params.tokenId)).limit(1)
    if (!current)
      return status(404, { error: 'Not found' })
    const storagePath = await writeUpload(`token-${params.tokenId}-${uploadName(body.file.name)}`, body.file)
    const [token] = await db.update(tokens).set({ imagePath: storagePath }).where(eq(tokens.id, params.tokenId)).returning()
    await broadcast(params.id)
    return toTokenDto(token)
  }, {
    dm: dmOnly,
    params: tokenParams,
    body: imageBody,
  })
  .post('/:id/tokens/:tokenId/move', async ({ params, body }) => {
    const token = await moveToken(params.tokenId, body.x, body.y)
    if (!token)
      return status(404, { error: 'Not found' })
    await broadcast(params.id)
    return toTokenDto(token)
  }, {
    member: true,
    params: tokenParams,
    body: moveTokenSchema,
  })
  .post('/:id/tokens/:tokenId/hp', async ({ params, body }) => {
    const token = await changeTokenHp(params.tokenId, body.delta)
    if (!token)
      return status(404, { error: 'Not found' })
    await broadcast(params.id)
    return toTokenDto(token)
  }, {
    dm: 'Только мастер меняет хиты фишки',
    params: tokenParams,
    body: hpSchema,
  })
  .post('/:id/tokens/:tokenId/hidden', async ({ params, body }) => {
    const token = await setTokenHidden(params.tokenId, body.hidden)
    await broadcast(params.id)
    return token ? toTokenDto(token) : null
  }, {
    dm: dmOnly,
    params: tokenParams,
    body: hiddenSchema,
  })
  .post('/:id/scenes/:sceneId/fog', async ({ params, body }) => {
    await replaceFog(params.sceneId, body.fog ?? [])
    await broadcast(params.id)
    return { ok: true }
  }, {
    dm: dmOnly,
    params: sceneParams,
    body: fogBodySchema,
  })
  .post('/:id/scenes/:sceneId/combat/start', async ({ params }) => {
    const combat = await startCombat(params.sceneId, 'dm')
    await broadcast(params.id)
    return combat
  }, {
    dm: dmOnly,
    params: sceneParams,
  })
  .post('/:id/scenes/:sceneId/combat/end', async ({ params }) => {
    await endCombat(params.sceneId)
    await broadcast(params.id)
    return { ok: true }
  }, {
    dm: dmOnly,
    params: sceneParams,
  })
