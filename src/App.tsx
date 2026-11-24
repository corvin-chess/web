import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { PlayPage } from "./play/PlayPage"

const DocumentTitle = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = pathname === "/play" ? "Play · Corvin" : "Corvin"
  }, [pathname])
  return null
}

export const App = () => {
  return (
    <BrowserRouter>
      <DocumentTitle />
      <Routes>
        <Route path="/play" element={<PlayPage />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
