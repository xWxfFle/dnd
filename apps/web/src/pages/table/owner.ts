import type { CampaignMemberDto } from '@dnd/shared'

export const roleSuffix = {
  dm: ' · мастер',
  player: '',
} as const satisfies Record<CampaignMemberDto['role'], string>

export function ownerCaption(userId: string, viewer: string | null, members: CampaignMemberDto[]) {
  if (viewer && userId === viewer)
    return 'Твой'
  return members.find(item => item.userId === userId)?.displayName ?? 'Игрок'
}
