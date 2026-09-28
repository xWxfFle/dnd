import type { SnapshotDto } from '@dnd/shared'
import { snapshotSchema } from '@dnd/shared'
import { effect, reaction, scoped, store } from '@virentia/core'
import { snapshotQuery } from '@/shared/api'
import { tableRoute } from '@/shared/routing'
import { appScope, readToken } from '@/shared/session'

export const liveSnapshot = store<SnapshotDto | null>(null)
let socket: WebSocket | null = null

export function sendLive(message: unknown) {
  if (socket?.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify(message))
}

export const connectFx = effect((campaignId: string) => {
  socket?.close()
  const current = readToken()
  const url = new URL(`/api/live/${campaignId}`, location.origin)
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  url.searchParams.set('token', current ?? '')
  const next = new WebSocket(url)
  socket = next
  next.onmessage = (event) => {
    const payload = JSON.parse(String(event.data)) as { type?: string, snapshot?: unknown }
    if (payload.type !== 'snapshot')
      return
    const parsed = snapshotSchema.safeParse(payload.snapshot)
    if (!parsed.success)
      return
    scoped(appScope, () => {
      liveSnapshot.value = parsed.data
    })
  }
  return next
})

export function bootTable() {
  scoped(appScope, () => {
    reaction({
      on: tableRoute.opened,
      run() {
        void connectFx(tableRoute.params.value.id)
      },
    })
    reaction({
      on: snapshotQuery.doneData,
      run(snapshot) {
        liveSnapshot.value = snapshot
      },
    })
    reaction({
      on: tableRoute.closed,
      run() {
        socket?.close()
        socket = null
      },
    })
  })
}
