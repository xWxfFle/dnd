import bearer from '@elysiajs/bearer'
import { Elysia } from 'elysia'
import { jwtPlugin, verifyToken } from '../modules/auth'

export const authGuard = new Elysia({ name: 'auth-guard' })
  .use(jwtPlugin)
  .use(bearer())
  .derive({ as: 'scoped' }, async ({ bearer, jwt, set }) => {
    if (!bearer) {
      set.status = 401
      throw new Error('Unauthorized')
    }
    const userId = await verifyToken(jwt, bearer)
    if (!userId) {
      set.status = 401
      throw new Error('Unauthorized')
    }
    return { userId }
  })
