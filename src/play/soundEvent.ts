/** Map SAN / protocol cues to play SFX events (CV-198). */

export type SoundEvent = "move" | "capture" | "check" | "game-end" | "offer"

export const SOUND_EVENTS: readonly SoundEvent[] = [
  "move",
  "capture",
  "check",
  "game-end",
  "offer",
] as const

/**
 * Prefer check over capture over quiet move (one SFX per ply).
 * Castling and promotions without capture/check stay `move`.
 */
export const soundEventFromSan = (san: string): SoundEvent => {
  const s = san.trim()
  if (!s) return "move"
  if (s.includes("+") || s.includes("#")) return "check"
  if (s.includes("x")) return "capture"
  return "move"
}
