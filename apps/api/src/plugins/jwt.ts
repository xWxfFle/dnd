import jwt from '@elysiajs/jwt'
import { Elysia } from 'elysia'

const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

export const jwtPlugin = new Elysia({ name: 'jwt-plugin' }).use(
  jwt({
    name: 'jwt',
    secret: jwtSecret,
    exp: '12h',
  }),
)

export async function verifyToken(
  jwtSign: { verify: (token: string) => Promise<unknown> },
  token: string,
): Promise<string | null> {
  const payload = await jwtSign.verify(token)
  if (!payload || typeof payload !== 'object' || !('sub' in payload))
    return null
  const sub = payload.sub
  return typeof sub === 'string' ? sub : null
}
