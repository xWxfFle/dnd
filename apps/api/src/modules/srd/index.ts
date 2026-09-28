import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { db } from '../../db'
import { srdEntries } from '../../db/schema'
import { authGuard } from '../../plugins/auth-guard'

const srdQuery = z.object({
  kind: z.string().optional(),
})

export const srdModule = new Elysia({ prefix: '/srd', name: 'srd' })
  .use(authGuard)
  .get('/', async ({ query }) => {
    const rows = query.kind
      ? await db.select().from(srdEntries).where(eq(srdEntries.kind, query.kind))
      : await db.select().from(srdEntries)
    return rows.map(row => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      body: row.body,
    }))
  }, {
    query: srdQuery,
  })
