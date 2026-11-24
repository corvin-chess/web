/** Injectable rules surface backed by chess-core WASM (CV-193 / CV-196). */
export type ChessRules = {
  legalMoves: (fen: string) => string[]
  applyMove: (fen: string, uci: string) => string
  /** SAN for a legal UCI from `fen` (includes + / #). */
  toSan?: (fen: string, uci: string) => string
}

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
