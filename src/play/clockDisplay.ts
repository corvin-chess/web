/**
 * Client-side clock display from PROTOCOL ClockSync / MoveApplied baselines.
 * Authoritative flag stays on the server; this is presentation only (CV-194).
 */

export type ClockPair = { w: number; b: number }

export type ClockBaseline = {
  clocks: ClockPair
  active: "w" | "b"
  /** Server unix ms when `clocks` were sampled. */
  serverTime: number
}

/** Remaining ms for a seat at `nowMs` (clamped at 0). */
export const displayRemainingMs = (
  baseline: ClockBaseline,
  color: "w" | "b",
  nowMs: number
): number => {
  const base = color === "w" ? baseline.clocks.w : baseline.clocks.b
  if (color !== baseline.active) return Math.max(0, Math.floor(base))
  const elapsed = Math.max(0, nowMs - baseline.serverTime)
  return Math.max(0, Math.floor(base - elapsed))
}

/** Format remaining ms as M:SS or H:MM:SS for long games. */
export const formatClockMs = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSec / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return `${minutes}:${pad(seconds)}`
}

/** DESIGN.md: pulse when <= 20s on the active clock. */
export const isLowTime = (ms: number): boolean => ms <= 20_000
