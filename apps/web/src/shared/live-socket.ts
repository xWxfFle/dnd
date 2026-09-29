import { dependency } from '@virentia/core'

export class LiveSocket {
  private socket: WebSocket | null = null

  connect(url: string) {
    const previous = this.socket
    this.socket = null
    previous?.close()
    const next = new WebSocket(url)
    this.socket = next
    return next
  }

  isCurrent(socket: WebSocket) {
    return this.socket === socket
  }

  send(message: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(JSON.stringify(message))
  }

  close() {
    const previous = this.socket
    this.socket = null
    previous?.close()
  }
}

export const liveClient = dependency<LiveSocket>('live')
