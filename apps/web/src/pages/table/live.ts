import type { SnapshotDto } from '@dnd/shared'
import { snapshotSchema } from '@dnd/shared'
import { effect, reaction, scoped, store } from '@virentia/core'
import { snapshotQuery } from '@/shared/api'
import { liveClient } from '@/shared/live-socket'
import { tableRoute } from '@/shared/routing'
import { appScope, readToken, signedOut } from '@/shared/session'

export const liveSnapshot = store<SnapshotDto | null>(null)

export const connectFx = effect((campaignId: string) => {
  return scoped(appScope, () => {
    const current = readToken()
    const url = new URL(`/api/live/${campaignId}`, location.origin)
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    url.searchParams.set('token', current ?? '')
    const next = liveClient.value.connect(url.toString())
    let opened = false
    next.onopen = () => {
      opened = true
    }
    next.onclose = () => {
      if (!opened || !liveClient.value.isCurrent(next))
        return
      setTimeout(() => {
        void connectFx(campaignId)
      }, 1000)
    }
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
})

export const sendLiveFx = effect((message: unknown) => {
  scoped(appScope, () => {
    liveClient.value.send(message)
  })
})

export const closeLiveFx = effect(() => {
  scoped(appScope, () => {
    liveClient.value.close()
  })
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
        void closeLiveFx()
      },
    })
    reaction({
      on: signedOut,
      run() {
        liveSnapshot.value = null
        void closeLiveFx()
      },
    })
  })
}
