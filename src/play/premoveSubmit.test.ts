/**
 * Pure helper covering the e2e premove fire path: after opponent MoveApplied,
 * only fire when it is our turn and the pending UCI is still legal.
 */
import { describe, expect, it, vi } from "vitest"
import { pendingFromSquares, resolvePendingPremove } from "./premove"
import {
  initialOnlineSession,
  isMyTurn,
  reduceOnlineSession,
} from "./onlineSession"
import type { ChessRules } from "../chess/types"

const asBlack = () =>
  reduceOnlineSession(initialOnlineSession(), {
    typ: "GameStart",
    gameId: "g1",
    color: "b",
    config: {
      timeClass: "blitz",
      initialMs: 180_000,
      incrementMs: 0,
      rated: true,
    },
    opponents: { w: "w1", b: "b1" },
    startClocks: { w: 180_000, b: 180_000 },
    serverTime: 1,
  })

describe("premove auto-submit path", () => {
  it("fires legal premove when MoveApplied makes it our turn", () => {
    let session = asBlack()
    expect(isMyTurn(session)).toBe(false)
    const pending = pendingFromSquares("e7", "e5")
    const afterWhite =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    session = reduceOnlineSession(session, {
      typ: "MoveApplied",
      gameId: "g1",
      fen: afterWhite,
      clocks: { w: 179_000, b: 180_000 },
      active: "b",
      seq: 1,
      serverTime: 2,
      san: "e4",
    })
    expect(isMyTurn(session)).toBe(true)
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(["e7e5", "e7e6", "b8c6"]),
      applyMove: vi.fn(),
    }
    expect(resolvePendingPremove(rules, session.fen, pending)).toBe("e7e5")
  })

  it("drops illegal premove after opponent changes the position", () => {
    let session = asBlack()
    // Premoving capture on e4 that never arrives.
    const pending = pendingFromSquares("d7", "e6")
    session = reduceOnlineSession(session, {
      typ: "MoveApplied",
      gameId: "g1",
      fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1",
      clocks: { w: 179_000, b: 180_000 },
      active: "b",
      seq: 1,
      serverTime: 2,
      san: "d4",
    })
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(["e7e5", "d7d5"]),
      applyMove: vi.fn(),
    }
    expect(resolvePendingPremove(rules, session.fen, pending)).toBeNull()
  })
})
