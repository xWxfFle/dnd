import type { UserDto } from '@dnd/shared'
import { userSchema } from '@dnd/shared'
import { event, provideDependency, scope, scoped, store } from '@virentia/core'
import { local, persist } from '@virentia/storage-core'
import { liveClient, LiveSocket } from './live-socket'

export const appScope = scope()

provideDependency(appScope, liveClient, new LiveSocket())
export const token = store<string | null>(null)
export const currentUser = store<UserDto | null>(null)
export const signedOut = event<void>()

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

export function clearSession() {
  scoped(appScope, () => {
    token.value = null
    currentUser.value = null
  })
}

export function noteUnauthorized() {
  scoped(appScope, () => {
    token.value = null
    currentUser.value = null
    signedOut()
  })
}

export function tokenUnexpired() {
  const json = readJwtPayload()
  if (!json)
    return false
  if (typeof json.exp === 'number' && json.exp * 1000 <= Date.now())
    return false
  return true
}

export function readUserId() {
  const json = readJwtPayload()
  return typeof json?.sub === 'string' ? json.sub : null
}

function readJwtPayload() {
  const current = readToken()
  const payload = current?.split('.')[1]
  if (!payload)
    return null
  try {
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: unknown, exp?: unknown }
  }
  catch {
    return null
  }
}
