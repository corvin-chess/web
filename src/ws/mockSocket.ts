/**
 * Minimal injectable WebSocket for unit tests (jsdom has no real WS).
 * CV-192: reconnect / resume contract tests only.
 */

type Listener = (ev: { data?: string; code?: number; reason?: string }) => void

export type MockSocketInstance = {
  url: string
  readyState: number
  sent: string[]
  onopen: ((ev: object) => void) | null
  onmessage: ((ev: { data: string }) => void) | null
  onclose: ((ev: { code: number; reason: string }) => void) | null
  onerror: ((ev: object) => void) | null
  send: (data: string) => void
  close: (code?: number, reason?: string) => void
  /** Test helpers */
  emitOpen: () => void
  emitMessage: (data: unknown) => void
  emitClose: (code?: number, reason?: string) => void
  addEventListener: (type: string, fn: Listener) => void
  removeEventListener: (type: string, fn: Listener) => void
}

export type MockSocketController = {
  instances: MockSocketInstance[]
  WebSocket: new (url: string) => MockSocketInstance
  CONNECTING: number
  OPEN: number
  CLOSING: number
  CLOSED: number
}

export const createMockWebSocket = (): MockSocketController => {
  const CONNECTING = 0
  const OPEN = 1
  const CLOSING = 2
  const CLOSED = 3
  const instances: MockSocketInstance[] = []

  class MockWebSocket {
    url: string
    readyState = CONNECTING
    sent: string[] = []
    onopen: ((ev: object) => void) | null = null
    onmessage: ((ev: { data: string }) => void) | null = null
    onclose: ((ev: { code: number; reason: string }) => void) | null = null
    onerror: ((ev: object) => void) | null = null
    private listeners = new Map<string, Set<Listener>>()

    constructor(url: string) {
      this.url = url
      instances.push(this as unknown as MockSocketInstance)
    }

    send(data: string) {
      if (this.readyState !== OPEN) {
        throw new Error("InvalidStateError: socket not open")
      }
      this.sent.push(data)
    }

    close(code = 1000, reason = "") {
      if (this.readyState === CLOSED || this.readyState === CLOSING) return
      this.readyState = CLOSING
      this.readyState = CLOSED
      const ev = { code, reason }
      this.onclose?.(ev)
      this.emit("close", ev)
    }

    addEventListener(type: string, fn: Listener) {
      let set = this.listeners.get(type)
      if (!set) {
        set = new Set()
        this.listeners.set(type, set)
      }
      set.add(fn)
    }

    removeEventListener(type: string, fn: Listener) {
      this.listeners.get(type)?.delete(fn)
    }

    emitOpen() {
      this.readyState = OPEN
      const ev = {}
      this.onopen?.(ev)
      this.emit("open", ev)
    }

    emitMessage(data: unknown) {
      const text = typeof data === "string" ? data : JSON.stringify(data)
      const ev = { data: text }
      this.onmessage?.(ev)
      this.emit("message", ev)
    }

    emitClose(code = 1000, reason = "") {
      this.readyState = CLOSED
      const ev = { code, reason }
      this.onclose?.(ev)
      this.emit("close", ev)
    }

    private emit(type: string, ev: { data?: string; code?: number; reason?: string }) {
      const set = this.listeners.get(type)
      if (!set) return
      for (const fn of set) fn(ev)
    }
  }

  return {
    instances,
    WebSocket: MockWebSocket as unknown as new (url: string) => MockSocketInstance,
    CONNECTING,
    OPEN,
    CLOSING,
    CLOSED,
  }
}

export const parseSent = (socket: MockSocketInstance): Record<string, unknown>[] =>
  socket.sent.map((raw) => JSON.parse(raw) as Record<string, unknown>)
