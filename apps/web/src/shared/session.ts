import { scope, scoped, store } from '@virentia/core'
import { local, persist } from '@virentia/storage-core'

export const appScope = scope()
export const token = store<string | null>(null)

scoped(appScope, () => {
  persist({ source: token, key: 'dnd_token', storage: local() })
})

export function readToken() {
  return scoped(appScope, () => token.value)
}

export function readUserId() {
  const current = readToken()
  const payload = current?.split('.')[1]
  if (!payload)
    return null
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: unknown }
    return typeof json.sub === 'string' ? json.sub : null
  }
  catch {
    return null
  }
}
