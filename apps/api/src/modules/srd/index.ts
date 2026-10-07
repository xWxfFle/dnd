import { inArray } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { db } from '../../db'
import { srdEntries } from '../../db/schema'
import { authGuard } from '../../plugins/auth-guard'

const srdQuery = z.object({
  kind: z.union([z.string(), z.array(z.string())]).optional(),
})

function kindsOf(kind: string | string[] | undefined) {
  const raw = kind == null ? [] : Array.isArray(kind) ? kind : kind.split(',')
  return raw.map(item => item.trim()).filter(Boolean)
}

export const srdModule = new Elysia({ prefix: '/srd', name: 'srd' })
  .use(authGuard)
  .get('/', async ({ query }) => {
    const kinds = kindsOf(query.kind)
    const rows = kinds.length > 0
      ? await db.select().from(srdEntries).where(inArray(srdEntries.kind, kinds))
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
