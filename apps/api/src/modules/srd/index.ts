import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { db } from '../../db'
import { srdEntries } from '../../db/schema'
import { authGuard } from '../../plugins/auth-guard'

export const srdModule = new Elysia({ prefix: '/srd' })
  .use(authGuard)
  .get('/', async ({ query }) => {
    const kind = typeof query.kind === 'string' ? query.kind : undefined
    const rows = kind
      ? await db.select().from(srdEntries).where(eq(srdEntries.kind, kind))
      : await db.select().from(srdEntries)
    return rows.map(row => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      body: row.body,
    }))
  })
