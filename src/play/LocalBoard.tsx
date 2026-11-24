import type { ChessRules } from "../chess/types"
import { START_FEN } from "../chess/types"
import { PlayBoard } from "./PlayBoard"

/** Local practice board (CV-193); thin wrapper over PlayBoard. */
export const LocalBoard = ({
  rules,
  announce,
}: {
  rules: ChessRules
  announce?: (message: string) => void
}) => (
  <PlayBoard
    rules={rules}
    fen={START_FEN}
    announce={announce}
    ariaLabel="Local board"
  />
)
