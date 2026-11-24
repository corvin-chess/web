import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"
import { getPlayShellStrings } from "../locales"
import { GameChrome } from "./GameChrome"
import type { OnlineSessionState } from "./onlineSession"

const baseSession = (): OnlineSessionState => ({
  phase: "playing",
  gameId: "g1",
  myColor: "w",
  config: {
    timeClass: "blitz",
    initialMs: 180_000,
    incrementMs: 2_000,
    rated: true,
  },
  fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  lastSeq: 1,
  lastSan: null,
  lastError: null,
  clocks: {
    clocks: { w: 60_000, b: 60_000 },
    active: "b",
    serverTime: Date.now(),
  },
  opponents: { w: "me", b: "opp" },
  pendingOffer: null,
  end: null,
})

describe("GameChrome aria-live SAN", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps a persistent polite live region before and after SAN", () => {
    const strings = getPlayShellStrings("en")
    const noop = vi.fn()
    const session = baseSession()
    const { rerender } = render(
      <GameChrome
        strings={strings}
        session={session}
        confirmMoves={false}
        onConfirmMovesChange={noop}
        hasPremove={false}
        onClearPremove={noop}
        onOfferDraw={noop}
        onOfferTakeback={noop}
        onRespond={noop}
        onResign={noop}
        onAbort={noop}
        onBackToLobby={noop}
      />
    )
    const live = screen.getByTestId("move-live")
    expect(live).toHaveAttribute("aria-live", "polite")
    expect(live).toHaveAttribute("aria-atomic", "true")

    rerender(
      <GameChrome
        strings={strings}
        session={{ ...session, lastSan: "e4", lastSeq: 2 }}
        confirmMoves={false}
        onConfirmMovesChange={noop}
        hasPremove={false}
        onClearPremove={noop}
        onOfferDraw={noop}
        onOfferTakeback={noop}
        onRespond={noop}
        onResign={noop}
        onAbort={noop}
        onBackToLobby={noop}
      />
    )
    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(screen.getByTestId("move-live")).toHaveTextContent("e4")
  })
})
