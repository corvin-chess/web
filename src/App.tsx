import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AuthPage } from "./auth/AuthPage"
import { AuthProvider } from "./auth/AuthProvider"
import { getAuthStrings, resolveLocale } from "./locales"
import { PlayPage } from "./play/PlayPage"

const DocumentTitle = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname === "/play") {
      document.title = "Play · Corvin"
      return
    }
    if (pathname === "/login") {
      const locale = resolveLocale(
        typeof navigator !== "undefined" ? navigator.language : "en"
      )
      document.title = getAuthStrings(locale).documentTitle
      return
    }
    document.title = "Corvin"
  }, [pathname])
  return null
}

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DocumentTitle />
        <Routes>
          <Route path="/play" element={<PlayPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/play" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
