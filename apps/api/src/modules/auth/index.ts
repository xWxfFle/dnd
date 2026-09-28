import { loginSchema, registerSchema } from '@dnd/shared'
import jwt from '@elysiajs/jwt'
import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { db } from '../../db'
import { users } from '../../db/schema'
import { hashPassword, toUserDto, verifyPassword } from '../../lib/auth-utils'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

export const authModule = new Elysia({ name: 'auth-module' })
  .use(jwt({ name: 'jwt', secret: JWT_SECRET, exp: '12h' }))
  .post('/auth/register', async ({ body, jwt: jwtSign, set }) => {
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    const { email, password, displayName } = parsed.data
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing) {
      set.status = 409
      return { error: 'Email already registered' }
    }
    const passwordHash = await hashPassword(password)
    const [user] = await db.insert(users).values({ email, passwordHash, displayName }).returning()
    const accessToken = await jwtSign.sign({ sub: user.id, email: user.email })
    return { accessToken, user: toUserDto(user) }
  })
  .post('/auth/login', async ({ body, jwt: jwtSign, set }) => {
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      set.status = 422
      return { error: parsed.error.flatten() }
    }
    const { email, password } = parsed.data
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      set.status = 401
      return { error: 'Invalid credentials' }
    }
    const accessToken = await jwtSign.sign({ sub: user.id, email: user.email })
    return { accessToken, user: toUserDto(user) }
  })
  .get('/auth/me', async ({ headers, jwt: jwtSign, set }) => {
    const auth = headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const payload = await jwtSign.verify(auth.slice(7))
    if (!payload || typeof payload.sub !== 'string') {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1)
    if (!user) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return { user: toUserDto(user) }
  })

export const jwtPlugin = jwt({
  name: 'jwt',
  secret: JWT_SECRET,
  exp: '12h',
})

export async function verifyToken(
  jwtSign: { verify: (token: string) => Promise<unknown> },
  token: string,
): Promise<string | null> {
  const payload = await jwtSign.verify(token)
  if (!payload || typeof payload !== 'object' || !('sub' in payload))
    return null
  const sub = (payload as { sub?: unknown }).sub
  return typeof sub === 'string' ? sub : null
}
