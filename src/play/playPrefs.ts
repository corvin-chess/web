/** Local play preferences: confirm, theme, sound (CV-195 / CV-198). */

import type { SoundEvent } from "./soundEvent"
import { SOUND_EVENTS } from "./soundEvent"
import type { ThemePref } from "./theme"

export type PlayPrefs = {
  /** When true, a completed two-click move waits for a second confirm before send. */
  confirmMoves: boolean
  theme: ThemePref
  /** Master mute: when true, no SFX play regardless of per-event flags. */
  soundMuted: boolean
  /** Per-event toggles; DESIGN defaults on for play SFX (no spectator crowd in v1). */
  soundEvents: Record<SoundEvent, boolean>
}

export const DEFAULT_SOUND_EVENTS: Record<SoundEvent, boolean> = {
  move: true,
  capture: true,
  check: true,
  "game-end": true,
  offer: true,
}

export const DEFAULT_PLAY_PREFS: PlayPrefs = {
  confirmMoves: false,
  theme: "system",
  soundMuted: false,
  soundEvents: { ...DEFAULT_SOUND_EVENTS },
}

const STORAGE_KEY = "corvin.play.prefs"

const isThemePref = (v: unknown): v is ThemePref =>
  v === "system" || v === "light" || v === "dark"

const normalizeSoundEvents = (
  raw: unknown
): Record<SoundEvent, boolean> => {
  const out = { ...DEFAULT_SOUND_EVENTS }
  if (!raw || typeof raw !== "object") return out
  const obj = raw as Record<string, unknown>
  for (const key of SOUND_EVENTS) {
    if (typeof obj[key] === "boolean") out[key] = obj[key]
  }
  return out
}

export const loadPlayPrefs = (): PlayPrefs => {
  if (typeof window === "undefined") return { ...DEFAULT_PLAY_PREFS, soundEvents: { ...DEFAULT_SOUND_EVENTS } }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PLAY_PREFS, soundEvents: { ...DEFAULT_SOUND_EVENTS } }
    const parsed = JSON.parse(raw) as Partial<PlayPrefs>
    return {
      confirmMoves: Boolean(parsed.confirmMoves),
      theme: isThemePref(parsed.theme) ? parsed.theme : DEFAULT_PLAY_PREFS.theme,
      soundMuted: Boolean(parsed.soundMuted),
      soundEvents: normalizeSoundEvents(parsed.soundEvents),
    }
  } catch {
    return { ...DEFAULT_PLAY_PREFS, soundEvents: { ...DEFAULT_SOUND_EVENTS } }
  }
}

export const savePlayPrefs = (prefs: PlayPrefs): void => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Private mode / quota: keep in-memory prefs; persistence is best-effort.
  }
}

/** Whether a given SFX may play under current prefs (pure). */
export const isSoundEnabled = (
  prefs: PlayPrefs,
  event: SoundEvent
): boolean => {
  if (prefs.soundMuted) return false
  return prefs.soundEvents[event] !== false
}
