/**
 * PROTOCOL v1 WebSocket client: Hello/Welcome/Ping + ResumeGame on reconnect.
 * Server remains authoritative; this client reconciles by seq (CV-192).
 */

import { SeqTracker } from "./seq"
import type {
  GameEventPayload,
  GameSnapshotMessage,
  ResumeTarget,
  WelcomeMessage,
  WsStatus,
} from "./types"
import { PROTOCOL_V } from "./types"

type SocketLike = {
  readyState: number
  send: (data: string) => void
  close: (code?: number, reason?: string) => void
  onopen: ((ev: object) => void) | null
  onmessage: ((ev: { data: string }) => void) | null
  onclose: ((ev: { code: number; reason: string }) => void) | null
  onerror: ((ev: object) => void) | null
}

type WebSocketCtor = new (url: string) => SocketLike

export type WsClientOptions = {
  url: string
  locale: string
  WebSocket?: WebSocketCtor
  /** Delay before each reconnect attempt; injectable for tests. */
  reconnectDelayMs?: (attempt: number) => number
}

type EventMap = {
  welcome: WelcomeMessage
  gameEvent: GameEventPayload
  snapshot: GameSnapshotMessage
  gameGone: { code: string; message: string }
  status: WsStatus
  error: { code: string; message: string }
  resync: undefined
}

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void

const defaultDelay = (attempt: number) =>
  Math.min(1000 * 2 ** Math.max(0, attempt - 1), 10_000)

export class WsClient {
  private readonly url: string
  private readonly locale: string
  private readonly WebSocketImpl: WebSocketCtor
  private readonly reconnectDelayMs: (attempt: number) => number

  private socket: SocketLike | null = null
  private intentionalClose = false
  private attempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _status: WsStatus = "idle"
  private _sessionId: string | null = null
  private _resume: ResumeTarget | null = null
  private readonly listeners = new Map<keyof EventMap, Set<Handler<keyof EventMap>>>()

  private readonly seq = new SeqTracker({
    onApply: (seq, payload) => {
      if (payload && typeof payload === "object") {
        const ev = payload as GameEventPayload
        this.emit("gameEvent", { ...ev, seq })
      }
      if (this._resume) {
        this._resume = { ...this._resume, lastSeq: seq }
      }
    },
    onResync: () => {
      this.emit("resync", undefined)
      // Only ask the server again when we have a resume seat; avoid duplicate
      // ResumeGame storms while a snapshot/Replay is already in flight (CV-194 wire).
      if (this._resume && this._status === "ready") {
        this.sendResumeIfNeeded()
      }
    },
  })

  constructor(opts: WsClientOptions) {
    this.url = opts.url
    this.locale = opts.locale
    this.WebSocketImpl =
      opts.WebSocket ??
      (globalThis.WebSocket as unknown as WebSocketCtor)
    this.reconnectDelayMs = opts.reconnectDelayMs ?? defaultDelay
  }

  get status(): WsStatus {
    return this._status
  }

  get sessionId(): string | null {
    return this._sessionId
  }

  get lastSeq(): number {
    return this.seq.lastSeq
  }

  get resumeTarget(): ResumeTarget | null {
    return this._resume
  }

  on<K extends keyof EventMap>(event: K, handler: Handler<K>) {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(handler as Handler<keyof EventMap>)
    return () => {
      set!.delete(handler as Handler<keyof EventMap>)
    }
  }

  setResumeTarget(target: ResumeTarget | null) {
    this._resume = target
      ? {
          gameId: target.gameId,
          lastSeq: target.lastSeq,
          playerToken: target.playerToken,
        }
      : null
    // Always reset tracker so a lower lastSeq on a new game is not stuck ahead.
    this.seq.resetTo(target ? target.lastSeq : 0)
  }

  /** Advance local last_seq without a wire event (tests / optimistic sync). */
  noteAppliedSeq(seq: number) {
    this.seq.noteApplied(seq)
    if (this._resume) {
      this._resume = { ...this._resume, lastSeq: Math.max(this._resume.lastSeq, seq) }
    }
  }

  connect() {
    this.intentionalClose = false
    this.clearReconnectTimer()
    this.replaceSocket()
  }

  disconnect() {
    this.intentionalClose = true
    this.clearReconnectTimer()
    this.setStatus("closed")
    this.teardownSocket()
  }

  private replaceSocket() {
    // Drop any prior socket without treating its close as a reconnect signal.
    if (this.socket) {
      const prev = this.socket
      this.socket = null
      prev.onopen = null
      prev.onmessage = null
      prev.onclose = null
      prev.onerror = null
      try {
        prev.close(1000, "replaced")
      } catch {
        // ignore
      }
    }
    this.openSocket()
  }

  private teardownSocket() {
    if (!this.socket) return
    const sock = this.socket
    this.socket = null
    sock.onopen = null
    sock.onmessage = null
    sock.onclose = null
    sock.onerror = null
    try {
      sock.close(1000, "client disconnect")
    } catch {
      // ignore
    }
  }

  private openSocket() {
    this.clearReconnectTimer()
    this.setStatus(this.attempt > 0 ? "reconnecting" : "connecting")
    const socket = new this.WebSocketImpl(this.url)
    this.socket = socket

    socket.onopen = () => {
      if (this.socket !== socket) return
      this.sendJson({
        typ: "Hello",
        v: PROTOCOL_V,
        client: "web",
        locale: this.locale,
      })
    }

    socket.onmessage = (ev) => {
      if (this.socket !== socket) return
      this.handleRaw(ev.data)
    }

    socket.onerror = () => {
      // Close handler drives reconnect; avoid double schedule.
    }

    socket.onclose = () => {
      // Ignore stale closes from sockets that were replaced.
      if (this.socket !== socket) return
      this.socket = null
      if (this.intentionalClose) {
        this.setStatus("closed")
        return
      }
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    this.setStatus("reconnecting")
    this.attempt += 1
    const delay = this.reconnectDelayMs(this.attempt)
    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.openSocket()
    }, delay)
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private handleRaw(data: string) {
    let value: Record<string, unknown>
    try {
      value = JSON.parse(data) as Record<string, unknown>
    } catch {
      return
    }
    const typ = value.typ
    if (typeof typ !== "string") return

    switch (typ) {
      case "Welcome":
        this.handleWelcome(value)
        break
      case "Ping":
        this.handlePing(value)
        break
      case "Pong":
        break
      case "GameSnapshot":
        this.handleSnapshot(value)
        break
      case "Replay":
        this.handleReplay(value)
        break
      case "Error":
        this.handleError(value)
        break
      default:
        this.handleSequenced(value)
        break
    }
  }

  private handleWelcome(value: Record<string, unknown>) {
    const sessionId = value.session_id
    const serverTime = value.server_time
    if (typeof sessionId !== "string" || typeof serverTime !== "number") return
    const features = Array.isArray(value.features)
      ? value.features.filter((f): f is string => typeof f === "string")
      : []
    this._sessionId = sessionId
    this.attempt = 0
    this.setStatus("ready")
    const msg: WelcomeMessage = {
      typ: "Welcome",
      v: typeof value.v === "number" ? value.v : PROTOCOL_V,
      session_id: sessionId,
      server_time: serverTime,
      features,
    }
    this.emit("welcome", msg)
    this.sendResumeIfNeeded()
  }

  private handlePing(value: Record<string, unknown>) {
    const nonce = value.nonce
    if (typeof nonce !== "string" || nonce.length === 0 || nonce.length > 128) {
      return
    }
    this.sendJson({ typ: "Pong", v: PROTOCOL_V, nonce })
  }

  private handleSnapshot(value: Record<string, unknown>) {
    const seq = value.seq
    const fen = value.fen
    const gameId = value.game_id
    const clocks = value.clocks
    const active = value.active
    if (
      typeof seq !== "number" ||
      typeof fen !== "string" ||
      typeof gameId !== "string" ||
      !clocks ||
      typeof clocks !== "object" ||
      (active !== "w" && active !== "b")
    ) {
      return
    }
    const clockObj = clocks as { w?: unknown; b?: unknown }
    if (typeof clockObj.w !== "number" || typeof clockObj.b !== "number") return

    this.seq.resetFromSnapshot(seq)
    if (this._resume) {
      this._resume = { ...this._resume, lastSeq: seq }
    }
    const snap: GameSnapshotMessage = {
      typ: "GameSnapshot",
      v: typeof value.v === "number" ? value.v : PROTOCOL_V,
      game_id: gameId,
      fen,
      clocks: { w: clockObj.w, b: clockObj.b },
      active,
      seq,
    }
    this.emit("snapshot", snap)
  }

  private handleReplay(value: Record<string, unknown>) {
    const events = value.events
    if (!Array.isArray(events)) return
    for (const raw of events) {
      if (!raw || typeof raw !== "object") continue
      this.handleSequenced(raw as Record<string, unknown>)
    }
  }

  private handleSequenced(value: Record<string, unknown>) {
    const seq = value.seq
    if (typeof seq !== "number") return
    const typ = value.typ
    if (typeof typ !== "string") return
    this.seq.ingest(seq, value)
  }

  private handleError(value: Record<string, unknown>) {
    const code = typeof value.code === "string" ? value.code : "INTERNAL"
    const message = typeof value.message === "string" ? value.message : ""
    if (code === "GAME_GONE") {
      this._resume = null
      this.emit("gameGone", { code, message })
    }
    this.emit("error", { code, message })
  }

  private sendResumeIfNeeded() {
    if (!this._resume) return
    if (this._status !== "ready") return
    this.sendJson({
      typ: "ResumeGame",
      v: PROTOCOL_V,
      game_id: this._resume.gameId,
      last_seq: this._resume.lastSeq,
      player_token: this._resume.playerToken,
    })
  }

  private sendJson(body: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== 1) return
    this.socket.send(JSON.stringify(body))
  }

  private setStatus(status: WsStatus) {
    this._status = status
    this.emit("status", status)
  }

  private emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    const set = this.listeners.get(event)
    if (!set) return
    for (const handler of set) {
      ;(handler as Handler<K>)(payload)
    }
  }
}
