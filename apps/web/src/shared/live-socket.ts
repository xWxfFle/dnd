import { dependency } from '@virentia/core'

export class LiveSocket {
  private socket: WebSocket | null = null

  connect(url: string) {
    this.close()
    const next = new WebSocket(url)
    this.socket = next
    return next
  }

  send(message: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify(message))
  }

  close() {
    this.socket?.close()
    this.socket = null
  }
}

export const liveClient = dependency<LiveSocket>('live')
