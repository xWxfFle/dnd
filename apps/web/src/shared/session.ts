import type { UserDto } from '@dnd/shared'
import { userSchema } from '@dnd/shared'
import { provideDependency, scope, scoped, store } from '@virentia/core'
import { local, persist } from '@virentia/storage-core'
import { liveClient, LiveSocket } from './live-socket'

export const appScope = scope()

provideDependency(appScope, liveClient, new LiveSocket())
export const token = store<string | null>(null)
export const currentUser = store<UserDto | null>(null)

scoped(appScope, () => {
  persist({ source: token, key: 'dnd_token', storage: local() })
  persist({
    source: currentUser,
    key: 'dnd_user',
    storage: local(),
    deserialize: (raw) => {
      const parsed = userSchema.safeParse(raw)
      return parsed.success ? parsed.data : null
    },
  })
})

export function readToken() {
  return scoped(appScope, () => token.value)
}

export function readCurrentUser() {
  return scoped(appScope, () => currentUser.value)
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
