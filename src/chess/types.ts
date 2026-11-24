/** Injectable rules surface backed by chess-core WASM (CV-193). */
export type ChessRules = {
  legalMoves: (fen: string) => string[]
  applyMove: (fen: string, uci: string) => string
}

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
