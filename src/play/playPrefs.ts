/** Local play preferences (CV-195 confirm moves). */

export type PlayPrefs = {
  /** When true, a completed two-click move waits for a second confirm before send. */
  confirmMoves: boolean
}

export const DEFAULT_PLAY_PREFS: PlayPrefs = {
  confirmMoves: false,
}

const STORAGE_KEY = "corvin.play.prefs"

export const loadPlayPrefs = (): PlayPrefs => {
  if (typeof window === "undefined") return { ...DEFAULT_PLAY_PREFS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PLAY_PREFS }
    const parsed = JSON.parse(raw) as Partial<PlayPrefs>
    return {
      confirmMoves: Boolean(parsed.confirmMoves),
    }
  } catch {
    return { ...DEFAULT_PLAY_PREFS }
  }
}

export const savePlayPrefs = (prefs: PlayPrefs): void => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}
