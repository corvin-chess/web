import {
  algebraicToSquare,
  parseFenPlacement,
} from "@corvin-chess/design-system"
import { pickUci, parseUci } from "./uci"
import type { ChessRules } from "./types"
import { START_FEN } from "./types"

export type LocalPlayState = {
  fen: string
  selected: string | null
  /** Destination squares that complete a legal UCI from `selected`. */
  legalDests: readonly string[]
  lastUci: string | null
  /** True only for the selectSquare call that just applied a move. */
  didMove: boolean
}

export type LocalPlayController = {
  getState: () => LocalPlayState
  /** Click or keyboard confirm on an algebraic square. */
  selectSquare: (algebraic: string) => LocalPlayState
  reset: (fen?: string) => LocalPlayState
}

const sideToMove = (fen: string): "w" | "b" => {
  const parts = fen.trim().split(/\s+/)
  return parts[1] === "b" ? "b" : "w"
}

const ownPieceAt = (fen: string, algebraic: string): boolean => {
  let squares
  try {
    squares = parseFenPlacement(fen)
  } catch {
    return false
  }
  const sq = algebraicToSquare(algebraic)
  const piece = squares[sq]
  if (!piece) return false
  return piece.color === sideToMove(fen)
}

const destsFrom = (moves: readonly string[], from: string): string[] => {
  const dests: string[] = []
  for (const m of moves) {
    const p = parseUci(m)
    if (p && p.from === from && !dests.includes(p.to)) dests.push(p.to)
  }
  return dests
}

/**
 * Local two-click (or re-select) play using chess-core legality only.
 * Promotions auto-choose queen when several legal promos share from-to.
 */
export const createLocalPlayController = (
  rules: ChessRules,
  initialFen: string = START_FEN
): LocalPlayController => {
  let fen = initialFen
  let selected: string | null = null
  let legalDests: string[] = []
  let lastUci: string | null = null

  const snapshot = (didMove = false): LocalPlayState => ({
    fen,
    selected,
    legalDests: [...legalDests],
    lastUci,
    didMove,
  })

  const clearSelection = () => {
    selected = null
    legalDests = []
  }

  const selectOwn = (algebraic: string, moves: string[]) => {
    const dests = destsFrom(moves, algebraic)
    if (dests.length === 0) {
      clearSelection()
      return
    }
    selected = algebraic
    legalDests = dests
  }

  return {
    getState: () => snapshot(false),
    reset: (next = START_FEN) => {
      fen = next
      lastUci = null
      clearSelection()
      return snapshot(false)
    },
    selectSquare: (algebraic: string) => {
      const moves = rules.legalMoves(fen)

      if (selected === null) {
        if (ownPieceAt(fen, algebraic)) selectOwn(algebraic, moves)
        return snapshot(false)
      }

      if (selected === algebraic) {
        clearSelection()
        return snapshot(false)
      }

      const uci = pickUci(moves, selected, algebraic)
      if (uci) {
        fen = rules.applyMove(fen, uci)
        lastUci = uci
        clearSelection()
        return snapshot(true)
      }

      if (ownPieceAt(fen, algebraic)) {
        selectOwn(algebraic, moves)
        return snapshot(false)
      }

      clearSelection()
      return snapshot(false)
    },
  }
}
