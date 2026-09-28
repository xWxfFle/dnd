import { Elysia } from 'elysia'
import { getCampaignRole } from '../lib/rbac'
import { authGuard } from './auth-guard'

function campaignId(params: object) {
  if ('id' in params && typeof params.id === 'string')
    return params.id
  return null
}

export function campaignRoutes(name: string) {
  return new Elysia({ name })
    .use(authGuard)
    .macro({
      member: {
        async resolve({ userId, params, status }) {
          const id = campaignId(params)
          if (!userId || !id)
            return status(404, { error: 'Not found' })
          const role = await getCampaignRole(userId, id)
          if (!role)
            return status(404, { error: 'Not found' })
          return { role }
        },
      },
      dm(message: string) {
        return {
          async resolve({ userId, params, status }) {
            const id = campaignId(params)
            if (!userId || !id)
              return status(404, { error: 'Not found' })
            const role = await getCampaignRole(userId, id)
            if (role !== 'dm')
              return status(403, { error: message })
            return { role }
          },
        }
      },
    })
}
