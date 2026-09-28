import { authResponseSchema, loginSchema, meResponseSchema, registerSchema } from '@dnd/shared'
import { eq } from 'drizzle-orm'
import { Elysia, status } from 'elysia'
import { db } from '../../db'
import { users } from '../../db/schema'
import { hashPassword, toUserDto, verifyPassword } from '../../lib/auth-utils'
import { authGuard } from '../../plugins/auth-guard'
import { jwtPlugin } from '../../plugins/jwt'
import { errorSchema } from '../params'

export const authModule = new Elysia({ name: 'auth-module' })
  .use(jwtPlugin)
  .post('/auth/register', async ({ body, jwt }) => {
    const { email, password, displayName } = body
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing)
      return status(409, { error: 'Email already registered' })
    const passwordHash = await hashPassword(password)
    const [user] = await db.insert(users).values({ email, passwordHash, displayName }).returning()
    const accessToken = await jwt.sign({ sub: user.id, email: user.email })
    return { accessToken, user: toUserDto(user) }
  }, {
    body: registerSchema,
    response: {
      200: authResponseSchema,
      409: errorSchema,
    },
  })
  .post('/auth/login', async ({ body, jwt }) => {
    const { email, password } = body
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      return status(401, { error: 'Invalid credentials' })
    const accessToken = await jwt.sign({ sub: user.id, email: user.email })
    return { accessToken, user: toUserDto(user) }
  }, {
    body: loginSchema,
    response: {
      200: authResponseSchema,
      401: errorSchema,
    },
  })
  .use(authGuard)
  .get('/auth/me', async ({ userId }) => {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user)
      return status(401, { error: 'Unauthorized' })
    return { user: toUserDto(user) }
  }, {
    response: {
      200: meResponseSchema,
      401: errorSchema,
    },
  })
