/** PROTOCOL v1 WebSocket message shapes used by the play client (CV-192). */

export const PROTOCOL_V = 1 as const

export type ClientKind = "web" | "mobile" | "bot"

export type HelloMessage = {
  typ: "Hello"
  v: typeof PROTOCOL_V
  client: ClientKind
  locale: string
}

export type WelcomeMessage = {
  typ: "Welcome"
  v: number
  session_id: string
  server_time: number
  features: string[]
}

export type PingMessage = {
  typ: "Ping"
  v: number
  nonce: string
}

export type PongMessage = {
  typ: "Pong"
  v: typeof PROTOCOL_V
  nonce: string
}

export type ResumeGameMessage = {
  typ: "ResumeGame"
  v: typeof PROTOCOL_V
  game_id: string
  last_seq: number
  player_token: string
}

export type GameSnapshotMessage = {
  typ: "GameSnapshot"
  v: number
  game_id: string
  fen: string
  clocks: { w: number; b: number }
  active: "w" | "b"
  seq: number
}

export type ReplayEvent = {
  typ: string
  seq: number
  [key: string]: unknown
}

export type ReplayMessage = {
  typ: "Replay"
  v: number
  game_id: string
  events: ReplayEvent[]
}

export type ErrorMessage = {
  typ: "Error"
  v: number
  code: string
  message: string
}

export type ResumeTarget = {
  gameId: string
  lastSeq: number
  playerToken: string
}

export type WsStatus = "idle" | "connecting" | "ready" | "reconnecting" | "closed"

export type GameEventPayload = ReplayEvent & { seq: number }

export type GameStartMessage = {
  typ: "GameStart"
  v: number
  game_id: string
  color: "w" | "b"
  config: {
    time_class: string
    initial_ms: number
    increment_ms: number
    rated: boolean
  }
  opponents: { w: { id: string }; b: { id: string } }
  start_clocks: { w: number; b: number }
}

export type AckMessage = {
  typ: "Ack"
  v: number
  id?: string
  seq?: number
}

export type ClockSyncMessage = {
  typ: "ClockSync"
  v: number
  game_id: string
  clocks: { w: number; b: number }
  active: "w" | "b"
  server_time: number
  lag?: { you_ms: number; opp_ms: number; server_ms: number }
}

export type MoveRejectedMessage = {
  typ: "MoveRejected"
  v: number
  id: string
  code: string
  message: string
}

export type GameEndMessage = {
  typ: "GameEnd"
  v: number
  game_id: string
  result: string
  reason: string
  winner?: string | null
  seq?: number
  rating_diff?: { w: number; b: number }
  flagged?: string
}
