import type { CampaignRole } from '@dnd/shared'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { campaignMembers, campaigns } from '../db/schema'

export async function getCampaignRole(userId: string, campaignId: string): Promise<CampaignRole | null> {
  const [row] = await db
    .select({ role: campaignMembers.role })
    .from(campaignMembers)
    .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, userId)))
    .limit(1)
  return row?.role ?? null
}

export async function canReadCampaign(userId: string, campaignId: string) {
  return (await getCampaignRole(userId, campaignId)) !== null
}

export async function canDm(userId: string, campaignId: string) {
  return (await getCampaignRole(userId, campaignId)) === 'dm'
}

export async function campaignIdByInvite(code: string) {
  const [row] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.inviteCode, code)).limit(1)
  return row?.id ?? null
}
