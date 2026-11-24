import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { authApi } from "./api"
import type { AuthSession } from "./types"

type AuthContextValue = {
  session: AuthSession | null
  loading: boolean
  setSession: (session: AuthSession | null) => void
  refreshSession: () => Promise<AuthSession | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    try {
      const next = await authApi.getSession()
      setSession(next)
      return next
    } catch {
      setSession(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const logout = useCallback(async () => {
    if (!session) return
    await authApi.logout(session.csrfToken)
    setSession(null)
  }, [session])

  const value = useMemo(
    () => ({ session, loading, setSession, refreshSession, logout }),
    [session, loading, refreshSession, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
