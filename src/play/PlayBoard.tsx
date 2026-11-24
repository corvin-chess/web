import { useEffect, useRef, useState } from "react"
import { mountBoard, type BoardHandle } from "@corvin-chess/design-system"
import "@corvin-chess/design-system/board.css"
import { createLocalPlayController } from "../chess/controller"
import { corvidPieceUrl } from "../chess/pieces"
import type { ChessRules } from "../chess/types"
import {
  formatLocaleString,
  getPlayStrings,
  resolveLocale,
  type LocaleCode,
} from "../locales"

type PlayBoardProps = {
  rules: ChessRules
  fen: string
  /** Board orientation (`white` | `black` from design-system). */
  orientation?: "white" | "black"
  /** When false, selection is ignored (opponent turn / ended). */
  interactive?: boolean
  /**
   * Online mode: parent owns fen. On a completed legal two-click, call with UCI
   * and do not mutate local fen (server MoveApplied will).
   */
  onSubmitMove?: (uci: string) => void
  announce?: (message: string) => void
  ariaLabel?: string
}

const isAlgebraic = (value: string): boolean => /^[a-h][1-8]$/.test(value)

const syncOverlays = (
  root: HTMLElement,
  selected: string | null,
  dests: readonly string[]
) => {
  root
    .querySelectorAll(".corvin-sq--legal, .corvin-sq--legal-capture, .corvin-sq--selected")
    .forEach((el) => {
      el.classList.remove(
        "corvin-sq--legal",
        "corvin-sq--legal-capture",
        "corvin-sq--selected"
      )
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
 * Ravenboard + WASM legality. Local apply when `onSubmitMove` is absent;
 * online submit when present (fen is controlled by parent).
 */
export const PlayBoard = ({
  rules,
  fen,
  orientation = "white",
  interactive = true,
  onSubmitMove,
  announce,
  ariaLabel = "Chess board play",
}: PlayBoardProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const boardRef = useRef<BoardHandle | null>(null)
  const playRef = useRef(createLocalPlayController(rules, fen))
  const onlineRef = useRef(Boolean(onSubmitMove))
  const interactiveRef = useRef(interactive)
  const submitRef = useRef(onSubmitMove)
  const locale = resolveLocale(
    typeof navigator !== "undefined" ? navigator.language : "en"
  )
  const [status, setStatus] = useState(getPlayStrings(locale).selectPiece)

  onlineRef.current = Boolean(onSubmitMove)
  interactiveRef.current = interactive
  submitRef.current = onSubmitMove

  useEffect(() => {
    playRef.current = createLocalPlayController(rules, fen)
    const host = hostRef.current
    if (!host) return
    const strings = getPlayStrings(locale)

    boardRef.current?.destroy()
    const handle = mountBoard(host, {
      fen,
      orientation,
      pieceUrl: corvidPieceUrl,
      showCoordinates: true,
      onFocusChange: () => {
        const state = playRef.current.getState()
        syncOverlays(handle.element, state.selected, state.legalDests)
      },
      onSelect: (_square, algebraic) => {
        if (!interactiveRef.current) return
        try {
          const prev = playRef.current.getState()
          const next = playRef.current.selectSquare(algebraic)
          if (onlineRef.current) {
            if (next.didMove && next.lastUci) {
              // Revert local fen; server is authoritative.
              playRef.current.reset(prev.fen)
              syncOverlays(handle.element, null, [])
              submitRef.current?.(next.lastUci)
              const msg = formatLocaleString(strings.played, { uci: next.lastUci })
              setStatus(msg)
              announce?.(msg)
              return
            }
            syncOverlays(handle.element, next.selected, next.legalDests)
            handle.element.querySelector<HTMLElement>(".corvin-board")?.focus()
            const msg = statusFor(locale, next)
            setStatus(msg)
            announce?.(msg)
            return
          }
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
  }, [rules, orientation, announce, locale])

  // Sync controlled fen for online (and local external resets).
  useEffect(() => {
    playRef.current.reset(fen)
    boardRef.current?.setFen(fen)
    if (boardRef.current) {
      syncOverlays(boardRef.current.element, null, [])
    }
  }, [fen])

  return (
    <section className="play-board" aria-label={ariaLabel}>
      <div className="play-board-host" ref={hostRef} />
      <p className="play-board-status" role="status" aria-live="polite">
        {status}
      </p>
    </section>
  )
}
