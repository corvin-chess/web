import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../auth/AuthProvider"
import { loadWasmRules } from "../chess/wasmRules"
import type { ChessRules } from "../chess/types"
import {
  getAuthStrings,
  getPlayShellStrings,
  getPlayStrings,
  resolveLocale,
} from "../locales"
import { GameChrome } from "./GameChrome"
import { LobbyPanel } from "./LobbyPanel"
import { LocalBoard } from "./LocalBoard"
import { PlayBoard } from "./PlayBoard"
import { isMyTurn } from "./onlineSession"
import { useOnlinePlay } from "./useOnlinePlay"

/**
 * Play shell: lobby quick-pair + online clocks/offers when signed in (CV-194);
 * local WASM board remains available for practice.
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

  const inOnlineGame =
    online.session.phase === "playing" || online.session.phase === "ended"

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
            interactive={
              online.session.phase === "playing" && isMyTurn(online.session)
            }
            onSubmitMove={online.submitMove}
            ariaLabel="Online board"
          />
          <GameChrome
            strings={shell}
            session={online.session}
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
    </main>
  )
}
