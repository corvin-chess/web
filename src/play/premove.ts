/**
 * Single pending premove + legality resolve after opponent move (CV-195).
 */

import { pickUci } from "../chess/uci"
import type { ChessRules } from "../chess/types"

export type PendingPremove = {
  from: string
  to: string
  uci: string
}

export const pendingFromSquares = (
  from: string,
  to: string,
  promotion?: string
): PendingPremove => ({
  from,
  to,
  uci: promotion ? `${from}${to}${promotion}` : `${from}${to}`,
})

/**
 * If the pending from-to is still a legal UCI in `fen`, return that UCI
 * (queen preferred for promotions). Otherwise null — caller clears the premove.
 */
export const resolvePendingPremove = (
  rules: ChessRules,
  fen: string,
  pending: PendingPremove
): string | null => {
  const moves = rules.legalMoves(fen)
  if (moves.includes(pending.uci)) return pending.uci
  return pickUci(moves, pending.from, pending.to)
}

export const clearPremoveIfIllegal = (
  rules: ChessRules,
  fen: string,
  pending: PendingPremove | null
): PendingPremove | null => {
  if (!pending) return null
  const uci = resolvePendingPremove(rules, fen, pending)
  if (!uci) return null
  if (uci === pending.uci) return pending
  return pendingFromSquares(pending.from, pending.to, uci.length === 5 ? uci[4] : undefined)
}
