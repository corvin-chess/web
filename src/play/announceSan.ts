import { formatLocaleString } from "../locales"

/** Format a move for the persistent aria-live SAN region. */
export const formatMoveAnnouncement = (
  template: string,
  san: string
): string => formatLocaleString(template, { san })

/**
 * Prefer chess-core SAN; fall back to UCI when toSan is missing or throws
 * (mocks / older WASM packages).
 */
export const sanForUci = (
  toSan: ((fen: string, uci: string) => string) | undefined,
  fen: string,
  uci: string
): string => {
  if (!toSan) return uci
  try {
    const san = toSan(fen, uci)
    return san.trim() ? san : uci
  } catch {
    return uci
  }
}
