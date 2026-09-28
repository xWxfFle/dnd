import type { CampaignRole } from '@dnd/shared'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createCampaignSchema, createCharacterSchema, createSceneSchema, createTokenSchema, hpSchema, moveTokenSchema, restSchema, rollRequestSchema, updateCharacterSchema, updateSceneSchema } from '@dnd/shared'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { db } from '../../db'
import { campaignMembers, campaigns, characters, scenes, tokens } from '../../db/schema'
import { inviteCode } from '../../lib/auth-utils'
import { activateScene, changeTokenHp, deleteScene, endCombat, moveToken, placeCharacterToken, removeCharacterToken, replaceFog, setTokenHidden, startCombat } from '../../lib/combat'
import { canDm, canReadCampaign, getCampaignRole } from '../../lib/rbac'
import { applyRest, buildSnapshot, createCharacter, recordRoll, toCharacterDto, toSceneDto, toTokenDto } from '../../lib/table'
import { broadcast } from '../../live/hub'
import { authGuard } from '../../plugins/auth-guard'

const uploadDir = process.env.UPLOAD_DIR ?? './data/uploads'

export const campaignsModule = new Elysia({ prefix: '/campaigns' })
  .use(authGuard)
  .get('/', async ({ userId }) => {
    const rows = await db
      .select({ campaign: campaigns, role: campaignMembers.role })
      .from(campaignMembers)
      .innerJoin(campaigns, eq(campaigns.id, campaignMembers.campaignId))
      .where(eq(campaignMembers.userId, userId))
    return rows.map(({ campaign, role }) => ({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      inviteCode: campaign.inviteCode,
      role,
      createdAt: campaign.createdAt.toISOString(),
    }))
  })
  .post('/', async ({ userId, body, set }) => {
    const parsed = createCampaignSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    const [campaign] = await db.insert(campaigns).values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      inviteCode: inviteCode(),
      ownerId: userId,
    }).returning()
    await db.insert(campaignMembers).values({ campaignId: campaign.id, userId, role: 'dm' })
    await db.insert(scenes).values({
      campaignId: campaign.id,
      name: 'Стол',
      grid: { columns: 20, rows: 14, cellSize: 48 },
      fog: [],
      active: true,
    })
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      inviteCode: campaign.inviteCode,
      role: 'dm' as const,
      createdAt: campaign.createdAt.toISOString(),
    }
  })
  .post('/join/:code', async ({ userId, params, set }) => {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.inviteCode, params.code)).limit(1)
    if (!campaign) {
      set.status = 404
      return { error: 'Приглашение не найдено' }
    }
    const existing = await getCampaignRole(userId, campaign.id)
    if (!existing) {
      await db.insert(campaignMembers).values({ campaignId: campaign.id, userId, role: 'player' })
    }
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      inviteCode: campaign.inviteCode,
      role: existing ?? 'player',
      createdAt: campaign.createdAt.toISOString(),
    }
  })
  .get('/:id/snapshot', async ({ userId, params, set }) => {
    const snapshot = await buildSnapshot(userId, params.id)
    if (!snapshot) {
      set.status = 404
      return { error: 'Not found' }
    }
    return snapshot
  })
  .get('/:id/characters', async ({ userId, params, set }) => {
    if (!(await canReadCampaign(userId, params.id))) {
      set.status = 404
      return { error: 'Not found' }
    }
    const role = await getCampaignRole(userId, params.id)
    const rows = await db.select().from(characters).where(eq(characters.campaignId, params.id))
    const visible = role === 'dm' ? rows : rows.filter(row => row.userId === userId)
    return visible.map(toCharacterDto)
  })
  .post('/:id/characters', async ({ userId, params, body, set }) => {
    if (!(await canReadCampaign(userId, params.id))) {
      set.status = 404
      return { error: 'Not found' }
    }
    const parsed = createCharacterSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    const character = await createCharacter({ ...parsed.data, campaignId: params.id, userId })
    if (!character) {
      set.status = 422
      return { error: 'Неизвестный класс, вид или предыстория' }
    }
    await broadcast(params.id)
    return character
  })
  .patch('/:id/characters/:characterId', async ({ userId, params, body, set }) => {
    if (!(await canReadCampaign(userId, params.id))) {
      set.status = 404
      return { error: 'Not found' }
    }
    const role = await getCampaignRole(userId, params.id)
    const [current] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    if (!current || current.campaignId !== params.id || (role !== 'dm' && current.userId !== userId)) {
      set.status = 404
      return { error: 'Not found' }
    }
    const parsed = updateCharacterSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    const [updated] = await db.update(characters).set(parsed.data).where(eq(characters.id, params.characterId)).returning()
    await broadcast(params.id)
    return toCharacterDto(updated)
  })
  .post('/:id/characters/:characterId/rest', async ({ userId, params, body, set }) => {
    const role = await getCampaignRole(userId, params.id)
    const [current] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    if (!current || current.campaignId !== params.id || (role !== 'dm' && current.userId !== userId)) {
      set.status = 404
      return { error: 'Not found' }
    }
    const parsed = restSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    const character = await applyRest(params.characterId, parsed.data.kind)
    await broadcast(params.id)
    return character
  })
  .post('/:id/scenes', async ({ userId, params, body, set }) => {
    if (!(await canDm(userId, params.id))) {
      set.status = 403
      return { error: 'Только мастер' }
    }
    const parsed = createSceneSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    await db.update(scenes).set({ active: false }).where(eq(scenes.campaignId, params.id))
    const [scene] = await db.insert(scenes).values({
      campaignId: params.id,
      name: parsed.data.name,
      grid: { columns: 20, rows: 14, cellSize: 48 },
      fog: [],
      active: true,
    }).returning()
    await broadcast(params.id)
    return toSceneDto(scene, 'dm')
  })
  .patch('/:id/scenes/:sceneId', async ({ userId, params, body, set }) => {
    if (!(await canDm(userId, params.id))) {
      set.status = 403
      return { error: 'Только мастер' }
    }
    const parsed = updateSceneSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    if (parsed.data.active)
      await activateScene(params.id, params.sceneId)
    const patch: Record<string, unknown> = {}
    if (parsed.data.name)
      patch.name = parsed.data.name
    if (parsed.data.grid)
      patch.grid = parsed.data.grid
    if (parsed.data.fog)
      patch.fog = parsed.data.fog
    if (parsed.data.dmNotes != null)
      patch.dmNotes = parsed.data.dmNotes
    const [scene] = Object.keys(patch).length
      ? await db.update(scenes).set(patch).where(eq(scenes.id, params.sceneId)).returning()
      : await db.select().from(scenes).where(eq(scenes.id, params.sceneId)).limit(1)
    await broadcast(params.id)
    return toSceneDto(scene, 'dm')
  })
  .delete('/:id/scenes/:sceneId', async ({ userId, params, set }) => {
    if (!(await canDm(userId, params.id))) {
      set.status = 403
      return { error: 'Только мастер' }
    }
    const scene = await deleteScene(params.id, params.sceneId)
    if (!scene) {
      set.status = 404
      return { error: 'Нет карты' }
    }
    await broadcast(params.id)
    return { ok: true }
  })
  .post('/:id/scenes/:sceneId/characters/:characterId', async ({ userId, params, set }) => {
    const role = await getCampaignRole(userId, params.id)
    if (!role) {
      set.status = 404
      return { error: 'Not found' }
    }
    const [character] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, params.sceneId)).limit(1)
    if (!character || !scene || character.campaignId !== params.id || scene.campaignId !== params.id) {
      set.status = 404
      return { error: 'Not found' }
    }
    if (role !== 'dm' && character.userId !== userId) {
      set.status = 403
      return { error: 'Чужой персонаж' }
    }
    const token = await placeCharacterToken(params.sceneId, character)
    await broadcast(params.id)
    return toTokenDto(token)
  })
  .delete('/:id/scenes/:sceneId/characters/:characterId', async ({ userId, params, set }) => {
    const role = await getCampaignRole(userId, params.id)
    if (!role) {
      set.status = 404
      return { error: 'Not found' }
    }
    const [character] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    if (!character || character.campaignId !== params.id) {
      set.status = 404
      return { error: 'Not found' }
    }
    if (role !== 'dm' && character.userId !== userId) {
      set.status = 403
      return { error: 'Чужой персонаж' }
    }
    const token = await removeCharacterToken(params.sceneId, params.characterId)
    if (!token) {
      set.status = 404
      return { error: 'Персонажа нет на карте' }
    }
    await broadcast(params.id)
    return { ok: true }
  })
  .post('/:id/characters/:characterId/avatar', async ({ userId, params, request, set }) => {
    const role = await getCampaignRole(userId, params.id)
    if (!role) {
      set.status = 404
      return { error: 'Not found' }
    }
    const [character] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    if (!character || character.campaignId !== params.id) {
      set.status = 404
      return { error: 'Not found' }
    }
    if (role !== 'dm' && character.userId !== userId) {
      set.status = 403
      return { error: 'Чужой персонаж' }
    }
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      set.status = 422
      return { error: 'Нужен файл портрета' }
    }
    await mkdir(uploadDir, { recursive: true })
    const filename = `avatar-${params.characterId}-${file.name.replace(/[^\w.()-]+/g, '_')}`
    const storagePath = path.join(uploadDir, filename)
    await writeFile(storagePath, Buffer.from(await file.arrayBuffer()))
    await db.update(characters).set({ avatarPath: storagePath }).where(eq(characters.id, params.characterId))
    await broadcast(params.id)
    return { ok: true }
  })
  .post('/:id/scenes/:sceneId/map', async ({ userId, params, request, set }) => {
    if (!(await canDm(userId, params.id))) {
      set.status = 403
      return { error: 'Только мастер' }
    }
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      set.status = 422
      return { error: 'Нужен файл карты' }
    }
    await mkdir(uploadDir, { recursive: true })
    const filename = `${params.sceneId}-${file.name.replace(/[^\w.()-]+/g, '_')}`
    const storagePath = path.join(uploadDir, filename)
    await writeFile(storagePath, Buffer.from(await file.arrayBuffer()))
    await db.update(scenes).set({ imagePath: storagePath }).where(eq(scenes.id, params.sceneId))
    await broadcast(params.id)
    return { ok: true }
  })
  .post('/:id/scenes/:sceneId/tokens', async ({ userId, params, body, set }) => {
    if (!(await canDm(userId, params.id))) {
      set.status = 403
      return { error: 'Только мастер' }
    }
    const parsed = createTokenSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    const [token] = await db.insert(tokens).values({
      sceneId: params.sceneId,
      name: parsed.data.name,
      x: parsed.data.x,
      y: parsed.data.y,
      size: parsed.data.size,
      hpCurrent: parsed.data.hpCurrent,
      hpMax: parsed.data.hpMax,
      hidden: parsed.data.hidden,
      characterId: parsed.data.characterId ?? null,
      monsterId: parsed.data.monsterId ?? null,
      color: parsed.data.color,
    }).returning()
    await broadcast(params.id)
    return toTokenDto(token)
  })
  .post('/:id/tokens/:tokenId/move', async ({ userId, params, body, set }) => {
    if (!(await canReadCampaign(userId, params.id))) {
      set.status = 404
      return { error: 'Not found' }
    }
    const parsed = moveTokenSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    const token = await moveToken(params.tokenId, parsed.data.x, parsed.data.y)
    if (!token) {
      set.status = 404
      return { error: 'Not found' }
    }
    await broadcast(params.id)
    return toTokenDto(token)
  })
  .post('/:id/tokens/:tokenId/hp', async ({ userId, params, body, set }) => {
    const role = await getCampaignRole(userId, params.id)
    if (role !== 'dm') {
      set.status = 403
      return { error: 'Только мастер меняет хиты фишки' }
    }
    const parsed = hpSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    const token = await changeTokenHp(params.tokenId, parsed.data.delta)
    if (!token) {
      set.status = 404
      return { error: 'Not found' }
    }
    await broadcast(params.id)
    return toTokenDto(token)
  })
  .post('/:id/tokens/:tokenId/hidden', async ({ userId, params, body, set }) => {
    if (!(await canDm(userId, params.id))) {
      set.status = 403
      return { error: 'Только мастер' }
    }
    const hidden = Boolean((body as { hidden?: boolean })?.hidden)
    const token = await setTokenHidden(params.tokenId, hidden)
    await broadcast(params.id)
    return token ? toTokenDto(token) : null
  })
  .post('/:id/scenes/:sceneId/fog', async ({ userId, params, body, set }) => {
    if (!(await canDm(userId, params.id))) {
      set.status = 403
      return { error: 'Только мастер' }
    }
    await replaceFog(params.sceneId, (body as { fog?: unknown }).fog ?? [])
    await broadcast(params.id)
    return { ok: true }
  })
  .post('/:id/scenes/:sceneId/combat/start', async ({ userId, params, set }) => {
    if (!(await canDm(userId, params.id))) {
      set.status = 403
      return { error: 'Только мастер' }
    }
    const combat = await startCombat(params.sceneId, 'dm')
    await broadcast(params.id)
    return combat
  })
  .post('/:id/scenes/:sceneId/combat/end', async ({ userId, params, set }) => {
    if (!(await canDm(userId, params.id))) {
      set.status = 403
      return { error: 'Только мастер' }
    }
    await endCombat(params.sceneId)
    await broadcast(params.id)
    return { ok: true }
  })
  .post('/:id/rolls', async ({ userId, params, body, set }) => {
    if (!(await canReadCampaign(userId, params.id))) {
      set.status = 404
      return { error: 'Not found' }
    }
    const parsed = rollRequestSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    const roll = await recordRoll({ ...parsed.data, campaignId: params.id, userId })
    if (!roll) {
      set.status = 422
      return { error: 'Формула вроде 2d6+3' }
    }
    await broadcast(params.id)
    return roll
  })

export const sceneImageModule = new Elysia()
  .get('/scenes/:sceneId/image', async ({ params, set }) => {
    const [scene] = await db.select().from(scenes).where(eq(scenes.id, params.sceneId)).limit(1)
    if (!scene?.imagePath) {
      set.status = 404
      return { error: 'Нет карты' }
    }
    const file = Bun.file(scene.imagePath)
    if (!(await file.exists())) {
      set.status = 404
      return { error: 'Файл карты не найден' }
    }
    return new Response(file)
  })
  .get('/characters/:characterId/avatar', async ({ params, set }) => {
    const [character] = await db.select().from(characters).where(eq(characters.id, params.characterId)).limit(1)
    if (!character?.avatarPath) {
      set.status = 404
      return { error: 'Нет портрета' }
    }
    const file = Bun.file(character.avatarPath)
    if (!(await file.exists())) {
      set.status = 404
      return { error: 'Файл портрета не найден' }
    }
    return new Response(file)
  })

export async function roleOf(userId: string, campaignId: string): Promise<CampaignRole | null> {
  return getCampaignRole(userId, campaignId)
}
