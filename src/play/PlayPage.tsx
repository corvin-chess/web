import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../auth/AuthProvider"
import { loadWasmRules } from "../chess/wasmRules"
import type { ChessRules } from "../chess/types"
import {
  formatLocaleString,
  getAuthStrings,
  getPlayShellStrings,
  getPlayStrings,
  resolveLocale,
} from "../locales"
import { GameChrome } from "./GameChrome"
import { LobbyPanel } from "./LobbyPanel"
import { LocalBoard } from "./LocalBoard"
import { PlayBoard } from "./PlayBoard"
import { loadPlayPrefs, savePlayPrefs } from "./playPrefs"
import { resolvePendingPremove, type PendingPremove } from "./premove"
import { isMyTurn } from "./onlineSession"
import { useOnlinePlay } from "./useOnlinePlay"

/**
 * Play shell: lobby quick-pair + online clocks/offers when signed in (CV-194);
 * premoves + optional confirm (CV-195); local WASM board for practice.
 */
export const PlayPage = () => {
  const { session: authSession, loading } = useAuth()
  const locale = resolveLocale(
    typeof navigator !== "undefined" ? navigator.language : "en"
  )
  const signInLabel = getAuthStrings(locale).signInLink
  const playStrings = getPlayStrings(locale)
  const shell = getPlayShellStrings(locale)
  const [rules, setRules] = useState<ChessRules | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingPremove, setPendingPremove] = useState<PendingPremove | null>(
    null
  )
  const [confirmMoves, setConfirmMoves] = useState(
    () => loadPlayPrefs().confirmMoves
  )
  const [premoveNotice, setPremoveNotice] = useState<string | null>(null)
  /** Guard Strict Mode double-fire for the same ply. */
  const premoveFiredSeqRef = useRef<number>(-1)

  const online = useOnlinePlay({
    enabled: Boolean(authSession),
    locale,
    playerToken: authSession?.userId ?? null,
  })

  useEffect(() => {
    let cancelled = false
    loadWasmRules()
      .then((r) => {
        if (!cancelled) setRules(r)
      })
      .catch(() => {
        if (!cancelled) setLoadError(playStrings.loadError)
      })
    return () => {
      cancelled = true
    }
  }, [playStrings.loadError])

  // Clear premove when the game ends or we return to lobby.
  useEffect(() => {
    if (online.session.phase !== "playing") {
      setPendingPremove(null)
      setPremoveNotice(null)
      premoveFiredSeqRef.current = -1
    }
  }, [online.session.phase])

  // After opponent MoveApplied, fire premove if still legal (client-side only).
  // interactive stays false while pendingPremove is set so the player cannot
  // race a live Move before this effect runs.
  useEffect(() => {
    if (!rules || !pendingPremove) return
    if (online.session.phase !== "playing") return
    if (!isMyTurn(online.session)) return
    if (premoveFiredSeqRef.current === online.session.lastSeq) return
    if (online.wsStatus !== "ready") return
    const uci = resolvePendingPremove(
      rules,
      online.session.fen,
      pendingPremove
    )
    premoveFiredSeqRef.current = online.session.lastSeq
    setPendingPremove(null)
    if (uci) {
      online.submitMove(uci, { premoved: true })
      setPremoveNotice(null)
    } else {
      setPremoveNotice(shell.game.premoveIllegal)
    }
  }, [
    rules,
    pendingPremove,
    online.session.phase,
    online.session.fen,
    online.session.lastSeq,
    online.session.clocks?.active,
    online.session.myColor,
    online.submitMove,
    online.wsStatus,
    shell.game.premoveIllegal,
  ])

  const handleConfirmMovesChange = (value: boolean) => {
    setConfirmMoves(value)
    savePlayPrefs({ confirmMoves: value })
  }

  const handleSubmitMove = (
    uci: string,
    meta?: { premoved?: boolean }
  ) => {
    // Any live send cancels a leftover pending premove.
    if (!meta?.premoved) setPendingPremove(null)
    online.submitMove(uci, meta)
  }

  const handleClearPremove = () => {
    setPendingPremove(null)
    setPremoveNotice(shell.game.premoveCleared)
  }

  const inOnlineGame =
    online.session.phase === "playing" || online.session.phase === "ended"
  const myTurn =
    online.session.phase === "playing" && isMyTurn(online.session)
  // Hold the board non-interactive until a queued premove is resolved/fired.
  const boardInteractive = myTurn && !pendingPremove

  return (
    <main className="play-shell" aria-label="Play" tabIndex={-1}>
      <h1 className="visually-hidden">Play</h1>
      <nav className="play-nav" aria-label="Account">
        {loading ? null : authSession ? (
          <p className="play-nav-status" role="status">
            {authSession.username}
            {online.wsStatus === "reconnecting" ? (
              <span className="play-nav-reconnect">
                {" "}
                — {shell.game.reconnecting}
              </span>
            ) : null}
          </p>
        ) : (
          <Link className="play-nav-link" to="/login">
            {signInLabel}
          </Link>
        )}
      </nav>

      {loadError ? (
        <p className="play-board-error" role="alert">
          {loadError}
        </p>
      ) : !rules ? (
        <p className="play-board-loading" role="status">
          {playStrings.loadingBoard}
        </p>
      ) : inOnlineGame ? (
        <div className="play-layout">
          <PlayBoard
            rules={rules}
            fen={online.session.fen}
            orientation={online.session.myColor === "b" ? "black" : "white"}
            interactive={boardInteractive}
            allowPremove={
              online.session.phase === "playing" &&
              !myTurn &&
              Boolean(online.session.myColor)
            }
            myColor={online.session.myColor ?? undefined}
            pendingPremove={pendingPremove}
            onPremoveChange={(p) => {
              setPendingPremove(p)
              setPremoveNotice(
                p
                  ? formatLocaleString(shell.game.premoveSet, { uci: p.uci })
                  : shell.game.premoveCleared
              )
            }}
            confirmMoves={confirmMoves}
            onSubmitMove={handleSubmitMove}
            ariaLabel="Online board"
          />
          <GameChrome
            strings={shell}
            session={online.session}
            confirmMoves={confirmMoves}
            onConfirmMovesChange={handleConfirmMovesChange}
            hasPremove={Boolean(pendingPremove)}
            onClearPremove={handleClearPremove}
            onOfferDraw={online.offerDraw}
            onOfferTakeback={online.offerTakeback}
            onRespond={online.respondOffer}
            onResign={online.resign}
            onAbort={online.abort}
            onBackToLobby={online.resetToLobby}
          />
        </div>
      ) : (
        <div className="play-layout play-layout--lobby">
          <LobbyPanel
            strings={shell}
            pairing={online.session.phase === "pairing"}
            disabled={!authSession || online.wsStatus !== "ready"}
            onQuickPair={online.quickPair}
            onCancel={online.cancelPair}
            lastError={online.session.lastError}
          />
          <LocalBoard rules={rules} />
        </div>
      )}
      {premoveNotice ? (
        <p className="visually-hidden" role="status">
          {premoveNotice}
        </p>
      ) : null}
    </main>
  )
}
