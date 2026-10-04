import { campaignSchema, createCampaignSchema, rollRequestSchema, snapshotSchema } from '@dnd/shared'
import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { z } from 'zod'
import { db } from '../../db'
import { campaignMembers, campaigns, scenes } from '../../db/schema'
import { inviteCode } from '../../lib/auth-utils'
import { getCampaignRole } from '../../lib/rbac'
import { buildSnapshot, recordRoll } from '../../lib/table'
import { broadcast } from '../../live/hub'
import { authGuard } from '../../plugins/auth-guard'
import { campaignRoutes } from '../../plugins/campaign-access'
import { charactersModule } from '../characters'
import { errorSchema, idParams, inviteParams } from '../params'
import { presetsModule } from '../presets'
import { scenesModule } from '../scenes'

function toCampaign(campaign: typeof campaigns.$inferSelect, role: 'dm' | 'player') {
  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    inviteCode: campaign.inviteCode,
    role,
    createdAt: campaign.createdAt.toISOString(),
  }
}

export const campaignsModule = new Elysia({ prefix: '/campaigns', name: 'campaigns' })
  .use(authGuard)
  .get('/', async ({ userId }) => {
    const rows = await db
      .select({ campaign: campaigns, role: campaignMembers.role })
      .from(campaignMembers)
      .innerJoin(campaigns, eq(campaigns.id, campaignMembers.campaignId))
      .where(eq(campaignMembers.userId, userId))
    return rows.map(({ campaign, role }) => toCampaign(campaign, role))
  }, {
    response: z.array(campaignSchema),
  })
  .post('/', async ({ userId, body }) => {
    const [campaign] = await db.insert(campaigns).values({
      name: body.name,
      description: body.description ?? null,
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
    return toCampaign(campaign, 'dm')
  }, {
    body: createCampaignSchema,
    response: campaignSchema,
  })
  .post('/join/:code', async ({ userId, params }) => {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.inviteCode, params.code)).limit(1)
    if (!campaign)
      return status(404, { error: 'Приглашение не найдено' })
    const existing = await getCampaignRole(userId, campaign.id)
    if (!existing)
      await db.insert(campaignMembers).values({ campaignId: campaign.id, userId, role: 'player' })
    return toCampaign(campaign, existing ?? 'player')
  }, {
    params: inviteParams,
    response: {
      200: campaignSchema,
      404: errorSchema,
    },
  })
  .use(campaignRoutes('campaign-table')
    .get('/:id/snapshot', async ({ userId, params }) => {
      const snapshot = await buildSnapshot(userId, params.id)
      if (!snapshot)
        return status(404, { error: 'Not found' })
      return snapshot
    }, {
      member: true,
      params: idParams,
      response: {
        200: snapshotSchema,
        404: errorSchema,
      },
    })
    .post('/:id/rolls', async ({ userId, params, body }) => {
      const roll = await recordRoll({ ...body, campaignId: params.id, userId })
      if (!roll)
        return status(422, { error: 'Формула вроде 2d6+3' })
      await broadcast(params.id)
      return roll
    }, {
      member: true,
      params: idParams,
      body: rollRequestSchema,
    }))
  .use(charactersModule)
  .use(presetsModule)
  .use(scenesModule)
