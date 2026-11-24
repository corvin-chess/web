/**
 * Pure online play session reducer for PROTOCOL GameStart / moves / offers (CV-194).
 */

import { START_FEN } from "../chess/types"
import type { ClockBaseline, ClockPair } from "./clockDisplay"

export type PairConfig = {
  timeClass: string
  initialMs: number
  incrementMs: number
  rated: boolean
}

export type PendingOffer = {
  offer: "draw" | "takeback"
  by: "w" | "b"
  status: "offered"
}

export type GameEndInfo = {
  result: string
  reason: string
  winner: "w" | "b" | null
  ratingDiff?: { w: number; b: number }
}

export type OnlinePhase = "idle" | "pairing" | "playing" | "ended"

export type OnlineSessionState = {
  phase: OnlinePhase
  gameId: string | null
  myColor: "w" | "b" | null
  config: PairConfig | null
  opponents: { w: string; b: string } | null
  fen: string
  clocks: ClockBaseline | null
  lastSeq: number
  pendingOffer: PendingOffer | null
  end: GameEndInfo | null
  lastError: string | null
  lastSan: string | null
}

export const initialOnlineSession = (): OnlineSessionState => ({
  phase: "idle",
  gameId: null,
  myColor: null,
  config: null,
  opponents: null,
  fen: START_FEN,
  clocks: null,
  lastSeq: 0,
  pendingOffer: null,
  end: null,
  lastError: null,
  lastSan: null,
})

export type OnlineSessionEvent =
  | { typ: "QuickPairSent" }
  | { typ: "QuickPairCancel" }
  | {
      typ: "GameStart"
      gameId: string
      color: "w" | "b"
      config: PairConfig
      opponents: { w: string; b: string }
      startClocks: ClockPair
      serverTime: number
    }
  | {
      typ: "MoveApplied"
      gameId: string
      fen: string
      clocks: ClockPair
      active: "w" | "b"
      seq: number
      serverTime: number
      san: string
    }
  | {
      typ: "ClockSync"
      gameId: string
      clocks: ClockPair
      active: "w" | "b"
      serverTime: number
    }
  | {
      typ: "OfferState"
      gameId: string
      offer: "draw" | "takeback"
      by: "w" | "b"
      status: "offered" | "accepted" | "declined" | "withdrawn"
      seq: number
    }
  | {
      typ: "GameEnd"
      gameId: string
      result: string
      reason: string
      winner: "w" | "b" | null
      ratingDiff?: { w: number; b: number }
      seq?: number
    }
  | {
      typ: "Snapshot"
      gameId: string
      fen: string
      clocks: ClockPair
      active: "w" | "b"
      seq: number
      serverTime: number
    }
  | { typ: "MoveRejected"; code: string; message: string }
  | { typ: "Error"; code: string; message: string }
  | { typ: "Reset" }

const sameGame = (state: OnlineSessionState, gameId: string): boolean =>
  state.gameId === null || state.gameId === gameId

export const reduceOnlineSession = (
  state: OnlineSessionState,
  event: OnlineSessionEvent
): OnlineSessionState => {
  switch (event.typ) {
    case "Reset":
      return initialOnlineSession()
    case "QuickPairSent":
      return {
        ...initialOnlineSession(),
        phase: "pairing",
      }
    case "QuickPairCancel":
      if (state.phase !== "pairing") return state
      return initialOnlineSession()
    case "GameStart":
      return {
        phase: "playing",
        gameId: event.gameId,
        myColor: event.color,
        config: event.config,
        opponents: event.opponents,
        fen: START_FEN,
        clocks: {
          clocks: event.startClocks,
          active: "w",
          serverTime: event.serverTime,
        },
        lastSeq: 0,
        pendingOffer: null,
        end: null,
        lastError: null,
        lastSan: null,
      }
    case "MoveApplied": {
      if (!sameGame(state, event.gameId)) return state
      // Never revive an ended game from a late MoveApplied.
      if (state.phase !== "playing") return state
      return {
        ...state,
        fen: event.fen,
        clocks: {
          clocks: event.clocks,
          active: event.active,
          serverTime: event.serverTime,
        },
        lastSeq: Math.max(state.lastSeq, event.seq),
        pendingOffer: null,
        lastSan: event.san,
        lastError: null,
      }
    }
    case "ClockSync": {
      if (!sameGame(state, event.gameId) || state.phase !== "playing") return state
      return {
        ...state,
        clocks: {
          clocks: event.clocks,
          active: event.active,
          serverTime: event.serverTime,
        },
      }
    }
    case "OfferState": {
      if (!sameGame(state, event.gameId) || state.phase !== "playing") return state
      const next: OnlineSessionState = {
        ...state,
        lastSeq: Math.max(state.lastSeq, event.seq),
      }
      if (event.status === "offered") {
        next.pendingOffer = {
          offer: event.offer,
          by: event.by,
          status: "offered",
        }
      } else {
        next.pendingOffer = null
      }
      return next
    }
    case "GameEnd": {
      if (!sameGame(state, event.gameId)) return state
      return {
        ...state,
        phase: "ended",
        pendingOffer: null,
        lastSeq:
          typeof event.seq === "number"
            ? Math.max(state.lastSeq, event.seq)
            : state.lastSeq,
        end: {
          result: event.result,
          reason: event.reason,
          winner: event.winner,
          ratingDiff: event.ratingDiff,
        },
      }
    }
    case "Snapshot": {
      if (!sameGame(state, event.gameId)) return state
      return {
        ...state,
        phase: state.phase === "ended" ? "ended" : "playing",
        gameId: event.gameId,
        fen: event.fen,
        clocks: {
          clocks: event.clocks,
          active: event.active,
          serverTime: event.serverTime,
        },
        lastSeq: event.seq,
        lastError: null,
      }
    }
    case "MoveRejected":
      return {
        ...state,
        lastError: event.code || event.message,
      }
    case "Error":
      return {
        ...state,
        lastError: event.code || event.message,
        phase:
          event.code === "ABORT_DENIED" || event.code === "OFFER_INVALID"
            ? state.phase
            : state.phase === "pairing"
              ? "idle"
              : state.phase,
      }
    default:
      return state
  }
}

export const isMyTurn = (state: OnlineSessionState): boolean => {
  if (state.phase !== "playing" || !state.myColor || !state.clocks) return false
  return state.clocks.active === state.myColor
}
