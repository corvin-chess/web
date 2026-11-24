import { useCallback, useEffect, useRef, useState } from "react"
import { WsClient, wsUrlFromPage, type WsClientOptions } from "../ws"
import {
  initialOnlineSession,
  reduceOnlineSession,
  type OnlineSessionState,
} from "./onlineSession"
import type { TimePreset } from "./timePresets"

type UseOnlinePlayOptions = {
  enabled: boolean
  locale: string
  /** Seat token for ResumeGame (server uses user id). */
  playerToken: string | null
  wsFactory?: (opts: WsClientOptions) => WsClient
}

let moveIdCounter = 0
const nextMoveId = () => {
  moveIdCounter += 1
  return `m${moveIdCounter}`
}

/**
 * Wire WsClient ↔ onlineSession for quick pair and in-game PROTOCOL events.
 */
export const useOnlinePlay = ({
  enabled,
  locale,
  playerToken,
  wsFactory,
}: UseOnlinePlayOptions) => {
  const [session, setSession] = useState<OnlineSessionState>(initialOnlineSession)
  const [wsStatus, setWsStatus] = useState<string>("idle")
  const clientRef = useRef<WsClient | null>(null)
  const playerTokenRef = useRef(playerToken)
  const gameIdRef = useRef<string | null>(null)
  /** Client-now minus Welcome.server_time for GameStart clock baseline. */
  const serverSkewRef = useRef(0)
  playerTokenRef.current = playerToken

  const dispatch = useCallback(
    (event: Parameters<typeof reduceOnlineSession>[1]) => {
      setSession((prev) => {
        const next = reduceOnlineSession(prev, event)
        gameIdRef.current = next.gameId
        return next
      })
    },
    []
  )

  useEffect(() => {
    if (!enabled) {
      clientRef.current?.disconnect()
      clientRef.current = null
      setSession(initialOnlineSession())
      setWsStatus("idle")
      return
    }

    const opts: WsClientOptions = {
      url: wsUrlFromPage(
        typeof window !== "undefined"
          ? window.location.href
          : "http://127.0.0.1:5173/"
      ),
      locale,
    }
    const client = wsFactory ? wsFactory(opts) : new WsClient(opts)
    clientRef.current = client

    const unsubs = [
      client.on("status", (s) => setWsStatus(s)),
      client.on("welcome", (msg) => {
        serverSkewRef.current = Date.now() - msg.server_time
      }),
      client.on("gameStart", (msg) => {
        // Align baseline with Welcome skew so the active clock does not jump early.
        const serverTime = Date.now() - serverSkewRef.current
        dispatch({
          typ: "GameStart",
          gameId: msg.game_id,
          color: msg.color,
          config: {
            timeClass: msg.config.time_class,
            initialMs: msg.config.initial_ms,
            incrementMs: msg.config.increment_ms,
            rated: msg.config.rated,
          },
          opponents: { w: msg.opponents.w.id, b: msg.opponents.b.id },
          startClocks: msg.start_clocks,
          serverTime,
        })
        const token = playerTokenRef.current
        if (token) {
          client.setResumeTarget({
            gameId: msg.game_id,
            lastSeq: 0,
            playerToken: token,
          })
        }
      }),
      client.on("clockSync", (msg) => {
        dispatch({
          typ: "ClockSync",
          gameId: msg.game_id,
          clocks: msg.clocks,
          active: msg.active,
          serverTime: msg.server_time,
        })
      }),
      client.on("moveRejected", (msg) => {
        dispatch({ typ: "MoveRejected", code: msg.code, message: msg.message })
      }),
      client.on("gameEnd", (msg) => {
        dispatch({
          typ: "GameEnd",
          gameId: msg.game_id,
          result: msg.result,
          reason: msg.reason,
          winner: msg.winner === "w" || msg.winner === "b" ? msg.winner : null,
          ratingDiff: msg.rating_diff,
          seq: msg.seq,
        })
      }),
      client.on("snapshot", (msg) => {
        dispatch({
          typ: "Snapshot",
          gameId: msg.game_id,
          fen: msg.fen,
          clocks: msg.clocks,
          active: msg.active,
          seq: msg.seq,
          serverTime: Date.now(),
        })
      }),
      client.on("gameEvent", (ev) => {
        if (ev.typ === "MoveApplied") {
          const clocks = ev.clocks as { w?: number; b?: number } | undefined
          const active = ev.active
          if (
            typeof ev.game_id !== "string" ||
            typeof ev.fen !== "string" ||
            typeof ev.san !== "string" ||
            !clocks ||
            typeof clocks.w !== "number" ||
            typeof clocks.b !== "number" ||
            (active !== "w" && active !== "b")
          ) {
            return
          }
          const ts = typeof ev.ts === "number" ? ev.ts : Date.now()
          dispatch({
            typ: "MoveApplied",
            gameId: ev.game_id,
            fen: ev.fen,
            clocks: { w: clocks.w, b: clocks.b },
            active,
            seq: ev.seq,
            serverTime: ts,
            san: ev.san,
          })
          return
        }
        if (ev.typ === "OfferState") {
          const offer = ev.offer
          const by = ev.by
          const status = ev.status
          if (
            typeof ev.game_id !== "string" ||
            (offer !== "draw" && offer !== "takeback") ||
            (by !== "w" && by !== "b") ||
            (status !== "offered" &&
              status !== "accepted" &&
              status !== "declined" &&
              status !== "withdrawn")
          ) {
            return
          }
          dispatch({
            typ: "OfferState",
            gameId: ev.game_id,
            offer,
            by,
            status,
            seq: ev.seq,
          })
          // Server OfferState(accepted) for takeback has no FEN; resync snapshot.
          if (offer === "takeback" && status === "accepted") {
            const token = playerTokenRef.current
            if (token) {
              client.setResumeTarget({
                gameId: ev.game_id,
                lastSeq: ev.seq,
                playerToken: token,
              })
              client.send({
                typ: "ResumeGame",
                game_id: ev.game_id,
                last_seq: ev.seq,
                player_token: token,
              })
            }
          }
        }
      }),
      client.on("error", (err) => {
        dispatch({ typ: "Error", code: err.code, message: err.message })
      }),
      client.on("gameGone", () => {
        dispatch({ typ: "Reset" })
      }),
    ]

    client.connect()

    return () => {
      for (const off of unsubs) off()
      client.disconnect()
      clientRef.current = null
    }
  }, [enabled, locale, wsFactory, dispatch])

  const quickPair = useCallback(
    (preset: TimePreset, rated: boolean, color: "random" | "white" | "black") => {
      const client = clientRef.current
      // Avoid pairing UI stuck waiting when the socket is not ready yet.
      if (!client || client.status !== "ready") return
      dispatch({ typ: "QuickPairSent" })
      client.send({
        typ: "QuickPair",
        time_class: preset.timeClass,
        initial_ms: preset.initialMs,
        increment_ms: preset.incrementMs,
        rated,
        color,
      })
    },
    [dispatch]
  )

  const cancelPair = useCallback(() => {
    clientRef.current?.send({ typ: "QuickPairCancel" })
    dispatch({ typ: "QuickPairCancel" })
  }, [dispatch])

  const submitMove = useCallback((uci: string) => {
    const client = clientRef.current
    const gameId = gameIdRef.current
    if (!client || !gameId) return
    client.send({
      typ: "Move",
      id: nextMoveId(),
      game_id: gameId,
      uci,
    })
  }, [])

  const offerDraw = useCallback(() => {
    const gameId = gameIdRef.current
    if (!gameId) return
    clientRef.current?.send({ typ: "OfferDraw", game_id: gameId })
  }, [])

  const offerTakeback = useCallback(() => {
    const gameId = gameIdRef.current
    if (!gameId) return
    clientRef.current?.send({ typ: "OfferTakeback", game_id: gameId })
  }, [])

  const respondOffer = useCallback((offer: "draw" | "takeback", accept: boolean) => {
    const gameId = gameIdRef.current
    if (!gameId) return
    clientRef.current?.send({
      typ: "OfferResponse",
      game_id: gameId,
      offer,
      accept,
    })
  }, [])

  const resign = useCallback(() => {
    const gameId = gameIdRef.current
    if (!gameId) return
    clientRef.current?.send({ typ: "Resign", game_id: gameId })
  }, [])

  const abort = useCallback(() => {
    const gameId = gameIdRef.current
    if (!gameId) return
    clientRef.current?.send({ typ: "Abort", game_id: gameId })
  }, [])

  const resetToLobby = useCallback(() => {
    clientRef.current?.setResumeTarget(null)
    dispatch({ typ: "Reset" })
  }, [dispatch])

  return {
    session,
    wsStatus,
    quickPair,
    cancelPair,
    submitMove,
    offerDraw,
    offerTakeback,
    respondOffer,
    resign,
    abort,
    resetToLobby,
  }
}
