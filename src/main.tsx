import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { loadPlayPrefs } from "./play/playPrefs"
import { applyTheme } from "./play/theme"
import "./styles.css"

// Apply persisted theme before first paint to avoid a light flash (CV-198).
applyTheme(loadPlayPrefs().theme)

const rootEl = document.getElementById("root")
if (!rootEl) {
  throw new Error("missing #root")
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)
