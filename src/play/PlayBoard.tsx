import { useEffect, useRef, useState } from "react"
import {
  algebraicToSquare,
  mountBoard,
  parseFenPlacement,
  type BoardHandle,
} from "@corvin-chess/design-system"
import "@corvin-chess/design-system/board.css"
import { createLocalPlayController } from "../chess/controller"
import { corvidPieceUrl } from "../chess/pieces"
import type { ChessRules } from "../chess/types"
import {
  formatLocaleString,
  getPlayShellStrings,
  getPlayStrings,
  resolveLocale,
  type LocaleCode,
} from "../locales"
import { formatMoveAnnouncement, sanForUci } from "./announceSan"
import { geometricPremoveDests } from "./premoveGeometry"
import { pendingFromSquares, type PendingPremove } from "./premove"

type PlayBoardProps = {
  rules: ChessRules
  fen: string
  /** Board orientation (`white` | `black` from design-system). */
  orientation?: "white" | "black"
  /** When false, selection is ignored for live moves (opponent turn / ended). */
  interactive?: boolean
  /** Opponent turn: allow setting a single geometric premove. */
  allowPremove?: boolean
  myColor?: "w" | "b"
  pendingPremove?: PendingPremove | null
  onPremoveChange?: (premove: PendingPremove | null) => void
  /** Require a second confirm click before submitting a live move. */
  confirmMoves?: boolean
  /**
   * Online mode: parent owns fen. On a completed legal two-click, call with UCI
   * and do not mutate local fen (server MoveApplied will).
   */
  onSubmitMove?: (uci: string, meta?: { premoved?: boolean }) => void
  announce?: (message: string) => void
  ariaLabel?: string
}

const isAlgebraic = (value: string): boolean => /^[a-h][1-8]$/.test(value)

const ownPieceAtColor = (
  fen: string,
  algebraic: string,
  color: "w" | "b"
): boolean => {
  try {
    const squares = parseFenPlacement(fen)
    const piece = squares[algebraicToSquare(algebraic)]
    return Boolean(piece && piece.color === color)
  } catch {
    return false
  }
}

const syncOverlays = (
  root: HTMLElement,
  selected: string | null,
  dests: readonly string[],
  pending: PendingPremove | null,
  awaiting: PendingPremove | null
) => {
  root
    .querySelectorAll(
      [
        ".corvin-sq--legal",
        ".corvin-sq--legal-capture",
        ".corvin-sq--selected",
        ".corvin-sq--premove",
        ".corvin-sq--premove-dest",
        ".corvin-sq--confirm",
      ].join(", ")
    )
    .forEach((el) => {
      el.classList.remove(
        "corvin-sq--legal",
        "corvin-sq--legal-capture",
        "corvin-sq--selected",
        "corvin-sq--premove",
        "corvin-sq--premove-dest",
        "corvin-sq--confirm"
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
  if (pending) {
    root
      .querySelector(`[data-square="${pending.from}"]`)
      ?.classList.add("corvin-sq--premove")
    root
      .querySelector(`[data-square="${pending.to}"]`)
      ?.classList.add("corvin-sq--premove-dest")
  }
  if (awaiting) {
    root
      .querySelector(`[data-square="${awaiting.from}"]`)
      ?.classList.add("corvin-sq--confirm")
    root
      .querySelector(`[data-square="${awaiting.to}"]`)
      ?.classList.add("corvin-sq--confirm")
  }
}

const statusFor = (
  locale: LocaleCode,
  next: ReturnType<ReturnType<typeof createLocalPlayController>["getState"]>,
  rules: ChessRules,
  fenBeforeMove: string
): string => {
  const strings = getPlayStrings(locale)
  if (next.didMove && next.lastUci) {
    const san = sanForUci(rules.toSan, fenBeforeMove, next.lastUci)
    return formatLocaleString(strings.played, { san })
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
  allowPremove = false,
  myColor,
  pendingPremove = null,
  onPremoveChange,
  confirmMoves = false,
  onSubmitMove,
  announce,
  ariaLabel = "Chess board play",
}: PlayBoardProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const boardRef = useRef<BoardHandle | null>(null)
  const playRef = useRef(createLocalPlayController(rules, fen))
  const onlineRef = useRef(Boolean(onSubmitMove))
  const interactiveRef = useRef(interactive)
  const allowPremoveRef = useRef(allowPremove)
  const myColorRef = useRef(myColor)
  const pendingRef = useRef(pendingPremove)
  const onPremoveChangeRef = useRef(onPremoveChange)
  const confirmMovesRef = useRef(confirmMoves)
  const submitRef = useRef(onSubmitMove)
  const fenRef = useRef(fen)
  const premoveFromRef = useRef<string | null>(null)
  const premoveDestsRef = useRef<string[]>([])
  const awaitingRef = useRef<PendingPremove | null>(null)
  const locale = resolveLocale(
    typeof navigator !== "undefined" ? navigator.language : "en"
  )
  const [status, setStatus] = useState(getPlayStrings(locale).selectPiece)
  const [awaitingConfirm, setAwaitingConfirm] = useState<PendingPremove | null>(
    null
  )

  onlineRef.current = Boolean(onSubmitMove)
  interactiveRef.current = interactive
  allowPremoveRef.current = allowPremove
  myColorRef.current = myColor
  pendingRef.current = pendingPremove
  onPremoveChangeRef.current = onPremoveChange
  confirmMovesRef.current = confirmMoves
  submitRef.current = onSubmitMove
  fenRef.current = fen
  awaitingRef.current = awaitingConfirm

  const paint = (
    selected: string | null,
    dests: readonly string[],
    pending: PendingPremove | null,
    awaiting: PendingPremove | null
  ) => {
    if (!boardRef.current) return
    syncOverlays(boardRef.current.element, selected, dests, pending, awaiting)
  }

  useEffect(() => {
    playRef.current = createLocalPlayController(rules, fen)
    const host = hostRef.current
    if (!host) return
    const strings = getPlayStrings(locale)
    const shell = getPlayShellStrings(locale)

    boardRef.current?.destroy()
    const handle = mountBoard(host, {
      fen,
      orientation,
      pieceUrl: corvidPieceUrl,
      showCoordinates: true,
      onFocusChange: () => {
        const state = playRef.current.getState()
        const selected = interactiveRef.current
          ? state.selected
          : premoveFromRef.current
        const dests = interactiveRef.current
          ? state.legalDests
          : premoveDestsRef.current
        paint(selected, dests, pendingRef.current, awaitingRef.current)
      },
      onSelect: (_square, algebraic) => {
        try {
          // Confirm-move: destination confirms; from-square or elsewhere cancels.
          const awaiting = awaitingRef.current
          if (awaiting && interactiveRef.current) {
            if (algebraic === awaiting.to) {
              if (awaitingRef.current === null) return
              awaitingRef.current = null
              setAwaitingConfirm(null)
              // Online: GameChrome aria-live announces server SAN; keep status quiet.
              submitRef.current?.(awaiting.uci)
              playRef.current.reset(fenRef.current)
              paint(null, [], pendingRef.current, null)
              return
            }
            setAwaitingConfirm(null)
            awaitingRef.current = null
            playRef.current.reset(fenRef.current)
            paint(null, [], pendingRef.current, null)
            setStatus(shell.game.cancelConfirm)
            announce?.(shell.game.cancelConfirm)
            if (algebraic === awaiting.from) return
            // Fall through so a new piece selection can start.
          }

          if (interactiveRef.current) {
            const prev = playRef.current.getState()
            const next = playRef.current.selectSquare(algebraic)
            if (onlineRef.current) {
              if (next.didMove && next.lastUci) {
                playRef.current.reset(prev.fen)
                if (confirmMovesRef.current) {
                  const pending = pendingFromSquares(
                    next.lastUci.slice(0, 2),
                    next.lastUci.slice(2, 4),
                    next.lastUci.length === 5 ? next.lastUci[4] : undefined
                  )
                  setAwaitingConfirm(pending)
                  awaitingRef.current = pending
                  paint(null, [], pendingRef.current, pending)
                  const msg = formatLocaleString(shell.game.confirmMove, {
                    uci: pending.uci,
                  })
                  setStatus(msg)
                  announce?.(msg)
                  return
                }
                paint(null, [], pendingRef.current, null)
                // Server MoveApplied drives the persistent SAN live region.
                submitRef.current?.(next.lastUci)
                return
              }
              paint(next.selected, next.legalDests, pendingRef.current, null)
              handle.element.querySelector<HTMLElement>(".corvin-board")?.focus()
              const msg = statusFor(locale, next, rules, prev.fen)
              setStatus(msg)
              announce?.(msg)
              return
            }
            if (next.fen !== prev.fen) {
              handle.setFen(next.fen)
            }
            paint(next.selected, next.legalDests, null, null)
            handle.element.querySelector<HTMLElement>(".corvin-board")?.focus()
            const msg = statusFor(locale, next, rules, prev.fen)
            setStatus(msg)
            if (next.didMove && next.lastUci) {
              const san = sanForUci(rules.toSan, prev.fen, next.lastUci)
              announce?.(
                formatMoveAnnouncement(shell.game.moveAnnounced, san)
              )
            } else {
              announce?.(msg)
            }
            return
          }

          // Premove path (opponent turn).
          if (!allowPremoveRef.current || !myColorRef.current) return
          const color = myColorRef.current
          const currentFen = fenRef.current

          if (premoveFromRef.current === null) {
            if (!ownPieceAtColor(currentFen, algebraic, color)) {
              // Empty click clears an existing premove.
              if (pendingRef.current) {
                onPremoveChangeRef.current?.(null)
                setStatus(shell.game.premoveCleared)
                announce?.(shell.game.premoveCleared)
              }
              return
            }
            const dests = geometricPremoveDests(currentFen, algebraic, color)
            if (dests.length === 0) return
            premoveFromRef.current = algebraic
            premoveDestsRef.current = dests
            paint(algebraic, dests, pendingRef.current, null)
            const msg = formatLocaleString(strings.selected, {
              square: algebraic,
              count: String(dests.length),
            })
            setStatus(msg)
            announce?.(msg)
            return
          }

          if (premoveFromRef.current === algebraic) {
            premoveFromRef.current = null
            premoveDestsRef.current = []
            paint(null, [], pendingRef.current, null)
            setStatus(strings.selectPiece)
            return
          }

          if (premoveDestsRef.current.includes(algebraic)) {
            const from = premoveFromRef.current
            // Auto-queen for premove promotions (same as live play).
            const promoRank = color === "w" ? "8" : "1"
            const isPawnPromo =
              algebraic[1] === promoRank &&
              ownPieceAtColor(currentFen, from, color) &&
              (() => {
                try {
                  const sq = parseFenPlacement(currentFen)[algebraicToSquare(from)]
                  return sq?.kind === "p"
                } catch {
                  return false
                }
              })()
            const pending = pendingFromSquares(
              from,
              algebraic,
              isPawnPromo ? "q" : undefined
            )
            premoveFromRef.current = null
            premoveDestsRef.current = []
            onPremoveChangeRef.current?.(pending)
            paint(null, [], pending, null)
            const msg = formatLocaleString(shell.game.premoveSet, {
              uci: pending.uci,
            })
            setStatus(msg)
            announce?.(msg)
            return
          }

          if (ownPieceAtColor(currentFen, algebraic, color)) {
            const dests = geometricPremoveDests(currentFen, algebraic, color)
            premoveFromRef.current = dests.length ? algebraic : null
            premoveDestsRef.current = dests
            paint(premoveFromRef.current, dests, pendingRef.current, null)
            return
          }

          premoveFromRef.current = null
          premoveDestsRef.current = []
          if (pendingRef.current) {
            onPremoveChangeRef.current?.(null)
            setStatus(shell.game.premoveCleared)
            announce?.(shell.game.premoveCleared)
          }
          paint(null, [], null, null)
        } catch {
          setStatus(strings.moveFailed)
          announce?.(strings.moveFailed)
        }
      },
    })
    boardRef.current = handle
    paint(
      null,
      [],
      pendingRef.current,
      awaitingRef.current
    )

    // Escape clears selection / confirm / premove (DESIGN keyboard path).
    // Listen on the section so Confirm/Cancel buttons also clear.
    const sectionEl = (host.closest(".play-board") ?? host) as HTMLElement
    const handleEscape = (event: Event) => {
      const ke = event as KeyboardEvent
      if (ke.key !== "Escape") return
      ke.preventDefault()
      let cleared = false
      if (awaitingRef.current) {
        awaitingRef.current = null
        setAwaitingConfirm(null)
        cleared = true
      }
      if (premoveFromRef.current) {
        premoveFromRef.current = null
        premoveDestsRef.current = []
        cleared = true
      }
      if (pendingRef.current) {
        onPremoveChangeRef.current?.(null)
        cleared = true
      }
      const state = playRef.current.getState()
      if (state.selected) {
        playRef.current.reset(fenRef.current)
        cleared = true
      }
      if (!cleared) return
      paint(null, [], null, null)
      setStatus(strings.selectPiece)
      announce?.(strings.selectPiece)
      handle.element.querySelector<HTMLElement>(".corvin-board")?.focus()
    }
    sectionEl.addEventListener("keydown", handleEscape)

    return () => {
      sectionEl.removeEventListener("keydown", handleEscape)
      handle.destroy()
      boardRef.current = null
    }
  }, [rules, orientation, announce, locale])

  // Sync controlled fen for online (and local external resets).
  useEffect(() => {
    playRef.current.reset(fen)
    boardRef.current?.setFen(fen)
    premoveFromRef.current = null
    premoveDestsRef.current = []
    setAwaitingConfirm(null)
    awaitingRef.current = null
    paint(null, [], pendingRef.current, null)
  }, [fen])

  // Keep premove overlay in sync when parent pending changes without fen change.
  useEffect(() => {
    const state = playRef.current.getState()
    paint(
      interactive ? state.selected : premoveFromRef.current,
      interactive ? state.legalDests : premoveDestsRef.current,
      pendingPremove,
      awaitingConfirm
    )
  }, [pendingPremove, awaitingConfirm, interactive])

  return (
    <section className="play-board" aria-label={ariaLabel}>
      <div className="play-board-host" ref={hostRef} />
      <p
        className="play-board-status"
        role="status"
        // Online SAN is GameChrome-only; local keeps polite status for selection + SAN.
        aria-live={onSubmitMove ? "off" : "polite"}
      >
        {status}
      </p>
      {awaitingConfirm ? (
        <div className="play-confirm-actions">
          <button
            type="button"
            className="lobby-primary"
            onClick={() => {
              const pending = awaitingRef.current
              if (!pending) return
              // Guard double-click: clear before send.
              awaitingRef.current = null
              setAwaitingConfirm(null)
              submitRef.current?.(pending.uci)
              playRef.current.reset(fenRef.current)
              paint(null, [], pendingRef.current, null)
            }}
          >
            {getPlayShellStrings(locale).game.confirmMoveAction}
          </button>
          <button
            type="button"
            onClick={() => {
              setAwaitingConfirm(null)
              awaitingRef.current = null
              playRef.current.reset(fenRef.current)
              paint(null, [], pendingRef.current, null)
              setStatus(getPlayShellStrings(locale).game.cancelConfirm)
            }}
          >
            {getPlayShellStrings(locale).game.cancelConfirm}
          </button>
        </div>
      ) : null}
    </section>
  )
}
