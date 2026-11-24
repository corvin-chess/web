import { Link } from "react-router-dom"
import { useAuth } from "../auth/AuthProvider"
import { getAuthStrings, resolveLocale } from "../locales"

/**
 * Blank play shell (CV-190). Board, clocks, offers, and WS arrive in later tasks.
 * Sign-in entry for CV-191 lives at /login (no auth forms here).
 */
export const PlayPage = () => {
  const { session, loading } = useAuth()
  const locale = resolveLocale(
    typeof navigator !== "undefined" ? navigator.language : "en"
  )
  const signInLabel = getAuthStrings(locale).signInLink

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
    </main>
  )
}
