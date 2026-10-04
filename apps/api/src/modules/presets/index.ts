import { createPresetSchema } from '@dnd/shared'
import { and, eq } from 'drizzle-orm'
import { status } from 'elysia'
import { z } from 'zod'
import { db } from '../../db'
import { creaturePresets } from '../../db/schema'
import { toPresetDto } from '../../lib/table'
import { broadcast } from '../../live/hub'
import { campaignRoutes } from '../../plugins/campaign-access'
import { idParams } from '../params'

const presetParams = z.object({
  id: z.uuid(),
  presetId: z.uuid(),
})

const dmOnly = 'Только мастер'

export const presetsModule = campaignRoutes('campaign-presets')
  .post('/:id/presets', async ({ params, body }) => {
    const [row] = await db.insert(creaturePresets).values({
      campaignId: params.id,
      name: body.name.trim(),
      ac: body.ac,
      hp: body.hp,
      speed: body.speed,
      attacks: body.attacks,
      abilities: body.abilities,
      saves: body.saves ?? {},
      color: body.color ?? '#5c4d7a',
    }).returning()
    await broadcast(params.id)
    return toPresetDto(row)
  }, {
    dm: dmOnly,
    params: idParams,
    body: createPresetSchema,
  })
  .delete('/:id/presets/:presetId', async ({ params }) => {
    const [row] = await db.delete(creaturePresets).where(and(
      eq(creaturePresets.id, params.presetId),
      eq(creaturePresets.campaignId, params.id),
    )).returning()
    if (!row)
      return status(404, { error: 'Нет пресета' })
    await broadcast(params.id)
    return { ok: true }
  }, {
    dm: dmOnly,
    params: presetParams,
  })
