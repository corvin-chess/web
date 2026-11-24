import { useId, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  formatAuthString,
  getAuthStrings,
  resolveLocale,
  type LocaleCode,
} from "../locales"
import { useAuth } from "./AuthProvider"
import { authApi } from "./api"
import type { AuthApiError, AuthMethod, AuthMode } from "./types"
import { createPasskeyCredential, getPasskeyCredential, supportsPasskeys } from "./webauthn"

const mapError = (err: unknown, t: ReturnType<typeof getAuthStrings>): string => {
  if (err && typeof err === "object" && "status" in err) {
    const apiErr = err as AuthApiError
    if (apiErr.status === 401) return t.errorUnauthorized
    if (apiErr.status === 409) return t.errorConflict
    if (apiErr.status === 0 || apiErr.message === "Failed to fetch") return t.errorNetwork
  }
  if (err instanceof TypeError) return t.errorNetwork
  if (err instanceof Error) {
    if (err.message === "passkey unsupported") return t.passkeyUnsupported
    if (err.message === "passkey cancelled") return t.passkeyCancelled
    if (/failed to fetch|networkerror|load failed/i.test(err.message)) {
      return t.errorNetwork
    }
  }
  return t.errorGeneric
}

/**
 * Auth UI for passkey + email OTP (CV-191). Talks to PROTOCOL `/api/v1/auth/*`.
 */
export const AuthPage = () => {
  const navigate = useNavigate()
  const { session, setSession, logout, loading } = useAuth()
  const [locale, setLocale] = useState<LocaleCode>(() =>
    resolveLocale(typeof navigator !== "undefined" ? navigator.language : "en")
  )
  const t = getAuthStrings(locale)
  const formId = useId()

  const [mode, setMode] = useState<AuthMode>("login")
  const [method, setMethod] = useState<AuthMethod>("passkey")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [code, setCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const title = mode === "login" ? t.title : t.registerTitle

  const handleLogout = async () => {
    setBusy(true)
    setError(null)
    try {
      await logout()
    } catch (err) {
      setError(mapError(err, t))
    } finally {
      setBusy(false)
    }
  }

  const parseBirthYear = (): number | undefined => {
    if (!birthYear.trim()) return undefined
    const n = Number.parseInt(birthYear, 10)
    if (!Number.isFinite(n)) return undefined
    return n
  }

  const handlePasskey = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === "register") {
        const start = await authApi.passkeyRegisterStart({
          username: username.trim(),
          email: email.trim() || undefined,
          birthYear: parseBirthYear(),
          locale,
        })
        const credential = await createPasskeyCredential(start.publicKey)
        const next = await authApi.passkeyRegisterFinish({
          challengeId: start.challengeId,
          credential,
        })
        setSession(next)
        navigate("/play", { replace: true })
        return
      }
      const start = await authApi.passkeyLoginStart({ username: username.trim() })
      const credential = await getPasskeyCredential(start.publicKey)
      const next = await authApi.passkeyLoginFinish({
        challengeId: start.challengeId,
        credential,
      })
      setSession(next)
      navigate("/play", { replace: true })
    } catch (err) {
      setError(mapError(err, t))
    } finally {
      setBusy(false)
    }
  }

  const handleSendCode = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await authApi.otpStart({
        purpose: mode,
        email: email.trim(),
        username: mode === "register" ? username.trim() : undefined,
        birthYear: mode === "register" ? parseBirthYear() : undefined,
        locale,
      })
      setCodeSent(true)
      setInfo(t.codeSent)
    } catch (err) {
      setError(mapError(err, t))
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyCode = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const next = await authApi.otpVerify({
        purpose: mode,
        email: email.trim(),
        code: code.trim(),
      })
      setSession(next)
      navigate("/play", { replace: true })
    } catch (err) {
      setError(mapError(err, t))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="auth-shell" aria-label={t.title} tabIndex={-1}>
        <p className="auth-muted">{t.title}…</p>
      </main>
    )
  }

  if (session) {
    return (
      <main className="auth-shell" aria-label={t.title} tabIndex={-1}>
        <h1>{t.title}</h1>
        <p role="status">
          {formatAuthString(t.signedInAs, { username: session.username })}
        </p>
        <div className="auth-actions">
          <button type="button" onClick={() => void handleLogout()} disabled={busy}>
            {t.logout}
          </button>
          <Link to="/play">{t.backToPlay}</Link>
        </div>
        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}
      </main>
    )
  }

  return (
    <main className="auth-shell" aria-label={title} tabIndex={-1}>
      <h1>{title}</h1>

      <div className="auth-tabs" role="group" aria-label={title}>
        <button
          type="button"
          aria-pressed={mode === "login"}
          id={`${formId}-tab-login`}
          onClick={() => {
            setMode("login")
            setCodeSent(false)
            setError(null)
            setInfo(null)
          }}
        >
          {t.tabLogin}
        </button>
        <button
          type="button"
          aria-pressed={mode === "register"}
          id={`${formId}-tab-register`}
          onClick={() => {
            setMode("register")
            setCodeSent(false)
            setError(null)
            setInfo(null)
          }}
        >
          {t.tabRegister}
        </button>
      </div>

      <div className="auth-method" role="group" aria-label={t.methodGroup}>
        <button
          type="button"
          aria-pressed={method === "passkey"}
          onClick={() => {
            setMethod("passkey")
            setError(null)
          }}
        >
          {t.methodPasskey}
        </button>
        <button
          type="button"
          aria-pressed={method === "email"}
          onClick={() => {
            setMethod("email")
            setError(null)
          }}
        >
          {t.methodEmail}
        </button>
      </div>

      <label className="auth-field">
        <span>{t.locale}</span>
        <select
          value={locale}
          onChange={(e) => setLocale(resolveLocale(e.target.value))}
          aria-label={t.locale}
        >
          <option value="en">English</option>
          <option value="it">Italiano</option>
        </select>
      </label>

      {method === "passkey" ? (
        <form className="auth-form" onSubmit={(e) => void handlePasskey(e)}>
          <label className="auth-field" htmlFor={`${formId}-username`}>
            <span>{t.username}</span>
            <input
              id={`${formId}-username`}
              name="username"
              autoComplete="username webauthn"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          {mode === "register" ? (
            <>
              <label className="auth-field" htmlFor={`${formId}-email`}>
                <span>{t.email}</span>
                <input
                  id={`${formId}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="auth-field" htmlFor={`${formId}-birth`}>
                <span>{t.birthYear}</span>
                <input
                  id={`${formId}-birth`}
                  name="birthYear"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  autoComplete="bday-year"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  aria-describedby={`${formId}-birth-hint`}
                />
              </label>
              <p id={`${formId}-birth-hint`} className="auth-hint">
                {t.birthYearHint}
              </p>
            </>
          ) : null}
          <button type="submit" disabled={busy || !supportsPasskeys()}>
            {t.continuePasskey}
          </button>
          {!supportsPasskeys() ? (
            <p className="auth-hint" role="status">
              {t.passkeyUnsupported}
            </p>
          ) : null}
        </form>
      ) : (
        <form
          className="auth-form"
          onSubmit={(e) => void (codeSent ? handleVerifyCode(e) : handleSendCode(e))}
        >
          {mode === "register" ? (
            <label className="auth-field" htmlFor={`${formId}-otp-username`}>
              <span>{t.username}</span>
              <input
                id={`${formId}-otp-username`}
                name="username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
          ) : null}
          <label className="auth-field" htmlFor={`${formId}-otp-email`}>
            <span>{t.email}</span>
            <input
              id={`${formId}-otp-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {mode === "register" ? (
            <>
              <label className="auth-field" htmlFor={`${formId}-otp-birth`}>
                <span>{t.birthYear}</span>
                <input
                  id={`${formId}-otp-birth`}
                  name="birthYear"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  aria-describedby={`${formId}-otp-birth-hint`}
                />
              </label>
              <p id={`${formId}-otp-birth-hint`} className="auth-hint">
                {t.birthYearHint}
              </p>
            </>
          ) : null}
          {codeSent ? (
            <label className="auth-field" htmlFor={`${formId}-code`}>
              <span>{t.code}</span>
              <input
                id={`${formId}-code`}
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          ) : null}
          <button type="submit" disabled={busy}>
            {codeSent ? t.verifyCode : t.sendCode}
          </button>
        </form>
      )}

      {info ? (
        <p className="auth-info" role="status">
          {info}
        </p>
      ) : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="auth-footer">
        <Link to="/play">{t.backToPlay}</Link>
      </p>
    </main>
  )
}
