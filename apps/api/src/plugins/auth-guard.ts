import bearer from '@elysiajs/bearer'
import { Elysia } from 'elysia'
import { jwtPlugin, verifyToken } from './jwt'

export const authGuard = new Elysia({ name: 'auth-guard' })
  .use(jwtPlugin)
  .use(bearer())
  .derive({ as: 'scoped' }, async ({ bearer: token, jwt, status }) => {
    if (!token)
      return status(401, { error: 'Unauthorized' })
    const userId = await verifyToken(jwt, token)
    if (!userId)
      return status(401, { error: 'Unauthorized' })
    return { userId }
  })
