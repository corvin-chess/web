/**
 * Geometric premove destinations (CV-195).
 * Ignores check and side-to-move; blocks slides on any piece; cannot land on own.
 * Original Corvin geometry — not copied from other clients.
 */

import {
  algebraicToSquare,
  parseFenPlacement,
  type Piece,
} from "@corvin-chess/design-system"

const FILES = "abcdefgh"

const inBounds = (file: number, rank: number): boolean =>
  file >= 0 && file <= 7 && rank >= 0 && rank <= 7

const algAt = (file: number, rank: number): string =>
  `${FILES[file]}${rank + 1}`

const parseAlg = (algebraic: string): { file: number; rank: number } | null => {
  if (!/^[a-h][1-8]$/.test(algebraic)) return null
  return { file: algebraic.charCodeAt(0) - 97, rank: Number(algebraic[1]) - 1 }
}

const pieceAt = (
  squares: (Piece | null)[],
  file: number,
  rank: number
): Piece | null => {
  if (!inBounds(file, rank)) return null
  return squares[algebraicToSquare(algAt(file, rank))] ?? null
}

const addIfLandable = (
  out: string[],
  squares: (Piece | null)[],
  file: number,
  rank: number,
  myColor: "w" | "b"
) => {
  if (!inBounds(file, rank)) return
  const p = pieceAt(squares, file, rank)
  if (p && p.color === myColor) return
  out.push(algAt(file, rank))
}

const slide = (
  out: string[],
  squares: (Piece | null)[],
  file: number,
  rank: number,
  df: number,
  dr: number,
  myColor: "w" | "b"
) => {
  let f = file + df
  let r = rank + dr
  while (inBounds(f, r)) {
    const p = pieceAt(squares, f, r)
    if (p) {
      if (p.color !== myColor) out.push(algAt(f, r))
      break
    }
    out.push(algAt(f, r))
    f += df
    r += dr
  }
}

const KNIGHT_DELTAS: readonly [number, number][] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
]

const KING_DELTAS: readonly [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
]

/**
 * Destinations a player may highlight as a single premove from `from`.
 * Empty when the square has no piece of `myColor`.
 */
export const geometricPremoveDests = (
  fen: string,
  from: string,
  myColor: "w" | "b"
): string[] => {
  let squares: (Piece | null)[]
  try {
    squares = parseFenPlacement(fen)
  } catch {
    return []
  }
  const parsed = parseAlg(from)
  if (!parsed) return []
  const piece = squares[algebraicToSquare(from)]
  if (!piece || piece.color !== myColor) return []

  const { file, rank } = parsed
  const out: string[] = []

  switch (piece.kind) {
    case "n":
      for (const [df, dr] of KNIGHT_DELTAS) {
        addIfLandable(out, squares, file + df, rank + dr, myColor)
      }
      break
    case "k":
      for (const [df, dr] of KING_DELTAS) {
        addIfLandable(out, squares, file + df, rank + dr, myColor)
      }
      // Castling premove targets when a same-color rook is still on the corner.
      if (myColor === "w" && from === "e1") {
        if (squares[algebraicToSquare("h1")]?.kind === "r") out.push("g1")
        if (squares[algebraicToSquare("a1")]?.kind === "r") out.push("c1")
      }
      if (myColor === "b" && from === "e8") {
        if (squares[algebraicToSquare("h8")]?.kind === "r") out.push("g8")
        if (squares[algebraicToSquare("a8")]?.kind === "r") out.push("c8")
      }
      break
    case "r":
      for (const [df, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        slide(out, squares, file, rank, df, dr, myColor)
      }
      break
    case "b":
      for (const [df, dr] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ] as const) {
        slide(out, squares, file, rank, df, dr, myColor)
      }
      break
    case "q":
      for (const [df, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ] as const) {
        slide(out, squares, file, rank, df, dr, myColor)
      }
      break
    case "p": {
      const dir = myColor === "w" ? 1 : -1
      const startRank = myColor === "w" ? 1 : 6
      const one = rank + dir
      if (inBounds(file, one) && !pieceAt(squares, file, one)) {
        out.push(algAt(file, one))
        const two = rank + 2 * dir
        if (rank === startRank && inBounds(file, two) && !pieceAt(squares, file, two)) {
          out.push(algAt(file, two))
        }
      }
      // Capture squares always offered for premoves (recapture intent).
      for (const df of [-1, 1]) {
        const cf = file + df
        const cr = rank + dir
        if (!inBounds(cf, cr)) continue
        const target = pieceAt(squares, cf, cr)
        if (!target || target.color !== myColor) out.push(algAt(cf, cr))
      }
      break
    }
  }

  return [...new Set(out)].filter((sq) => sq !== from)
}
