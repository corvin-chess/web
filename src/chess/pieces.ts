import { corvidFileName, type Piece, type PieceUrlFn } from "@corvin-chess/design-system"

/** Corvid SVGs served from this app's `public/pieces/corvid` (copied from assets). */
export const corvidPieceUrl: PieceUrlFn = (piece: Piece): string =>
  `/pieces/corvid/${corvidFileName(piece)}`
