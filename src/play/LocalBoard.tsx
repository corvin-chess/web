import { useEffect, useRef, useState } from "react"
import { mountBoard, type BoardHandle } from "@corvin-chess/design-system"
import "@corvin-chess/design-system/board.css"
import { createLocalPlayController } from "../chess/controller"
import { corvidPieceUrl } from "../chess/pieces"
import { START_FEN, type ChessRules } from "../chess/types"
import {
  formatLocaleString,
  getPlayStrings,
  resolveLocale,
  type LocaleCode,
} from "../locales"

type LocalBoardProps = {
  rules: ChessRules
  initialFen?: string
  announce?: (message: string) => void
}

const isAlgebraic = (value: string): boolean => /^[a-h][1-8]$/.test(value)

const syncOverlays = (
  root: HTMLElement,
  selected: string | null,
  dests: readonly string[]
) => {
  root.querySelectorAll(".corvin-sq--legal, .corvin-sq--legal-capture, .corvin-sq--selected").forEach((el) => {
    el.classList.remove("corvin-sq--legal", "corvin-sq--legal-capture", "corvin-sq--selected")
  })
  if (selected && isAlgebraic(selected)) {
    root.querySelector(`[data-square="${selected}"]`)?.classList.add("corvin-sq--selected")
  }
  for (const alg of dests) {
    if (!isAlgebraic(alg)) continue
    const cell = root.querySelector(`[data-square="${alg}"]`)
    if (!cell) continue
    const occupied = cell.querySelector(".corvin-piece") !== null
    cell.classList.add(occupied ? "corvin-sq--legal-capture" : "corvin-sq--legal")
  }
}

const statusFor = (
  locale: LocaleCode,
  next: ReturnType<ReturnType<typeof createLocalPlayController>["getState"]>
): string => {
  const strings = getPlayStrings(locale)
  if (next.didMove && next.lastUci) {
    return formatLocaleString(strings.played, { uci: next.lastUci })
  }
  if (next.selected) {
    return formatLocaleString(strings.selected, {
      square: next.selected,
      count: String(next.legalDests.length),
    })
  }
  return strings.selectPiece
}

/**
 * Interactive local board: design-system Ravenboard + chess-core legality via WASM.
 */
export const LocalBoard = ({
  rules,
  initialFen = START_FEN,
  announce,
}: LocalBoardProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const boardRef = useRef<BoardHandle | null>(null)
  const playRef = useRef(createLocalPlayController(rules, initialFen))
  const locale = resolveLocale(
    typeof navigator !== "undefined" ? navigator.language : "en"
  )
  const [status, setStatus] = useState(getPlayStrings(locale).selectPiece)

  useEffect(() => {
    playRef.current = createLocalPlayController(rules, initialFen)
    const host = hostRef.current
    if (!host) return
    const strings = getPlayStrings(locale)

    boardRef.current?.destroy()
    const handle = mountBoard(host, {
      fen: initialFen,
      pieceUrl: corvidPieceUrl,
      showCoordinates: true,
      onFocusChange: () => {
        // Arrow keys re-paint inside mountBoard; restore legal overlays.
        const state = playRef.current.getState()
        syncOverlays(handle.element, state.selected, state.legalDests)
      },
      onSelect: (_square, algebraic) => {
        try {
          const prev = playRef.current.getState()
          const next = playRef.current.selectSquare(algebraic)
          if (next.fen !== prev.fen) {
            handle.setFen(next.fen)
          }
          syncOverlays(handle.element, next.selected, next.legalDests)
          handle.element.querySelector<HTMLElement>(".corvin-board")?.focus()

          const msg = statusFor(locale, next)
          setStatus(msg)
          announce?.(msg)
        } catch {
          setStatus(strings.moveFailed)
          announce?.(strings.moveFailed)
        }
      },
    })
    boardRef.current = handle

    return () => {
      handle.destroy()
      boardRef.current = null
    }
  }, [rules, initialFen, announce, locale])

  return (
    <section className="local-board" aria-label="Local board">
      <div className="local-board-host" ref={hostRef} />
      <p className="local-board-status" role="status" aria-live="polite">
        {status}
      </p>
    </section>
  )
}
