import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../auth/AuthProvider"
import { loadWasmRules } from "../chess/wasmRules"
import type { ChessRules } from "../chess/types"
import { getAuthStrings, getPlayStrings, resolveLocale } from "../locales"
import { LocalBoard } from "./LocalBoard"

/**
 * Play shell with local board legality via chess-core WASM (CV-193).
 * Online clocks/offers/WS play arrive in CV-194+.
 */
export const PlayPage = () => {
  const { session, loading } = useAuth()
  const locale = resolveLocale(
    typeof navigator !== "undefined" ? navigator.language : "en"
  )
  const signInLabel = getAuthStrings(locale).signInLink
  const playStrings = getPlayStrings(locale)
  const [rules, setRules] = useState<ChessRules | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

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

  return (
    <main className="play-shell" aria-label="Play" tabIndex={-1}>
      <h1 className="visually-hidden">Play</h1>
      <nav className="play-nav" aria-label="Account">
        {loading ? null : session ? (
          <p className="play-nav-status" role="status">
            {session.username}
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
      ) : rules ? (
        <LocalBoard rules={rules} />
      ) : (
        <p className="play-board-loading" role="status">
          {playStrings.loadingBoard}
        </p>
      )}
    </main>
  )
}
