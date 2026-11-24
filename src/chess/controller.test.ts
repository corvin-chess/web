import { describe, expect, it, vi } from "vitest"
import { createLocalPlayController } from "./controller"
import { START_FEN } from "./types"
import type { ChessRules } from "./types"

const startMoves = [
  "a2a3",
  "a2a4",
  "b2b3",
  "b2b4",
  "c2c3",
  "c2c4",
  "d2d3",
  "d2d4",
  "e2e3",
  "e2e4",
  "f2f3",
  "f2f4",
  "g2g3",
  "g2g4",
  "h2h3",
  "h2h4",
  "b1a3",
  "b1c3",
  "g1f3",
  "g1h3",
]

describe("createLocalPlayController", () => {
  it("selects a pawn and lists legal dests from rules", () => {
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(startMoves),
      applyMove: vi.fn(),
    }
    const play = createLocalPlayController(rules)
    const state = play.selectSquare("e2")
    expect(state.selected).toBe("e2")
    expect(state.legalDests).toEqual(["e3", "e4"])
    expect(rules.applyMove).not.toHaveBeenCalled()
  })

  it("applies a legal two-click move and clears selection", () => {
    const after =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(startMoves),
      applyMove: vi.fn().mockReturnValue(after),
    }
    const play = createLocalPlayController(rules)
    play.selectSquare("e2")
    const state = play.selectSquare("e4")
    expect(rules.applyMove).toHaveBeenCalledWith(START_FEN, "e2e4")
    expect(state.fen).toBe(after)
    expect(state.selected).toBeNull()
    expect(state.legalDests).toEqual([])
    expect(state.lastUci).toBe("e2e4")
  })

  it("rejects an illegal destination without applying", () => {
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(startMoves),
      applyMove: vi.fn(),
    }
    const play = createLocalPlayController(rules)
    play.selectSquare("e2")
    const state = play.selectSquare("e5")
    expect(rules.applyMove).not.toHaveBeenCalled()
    expect(state.fen).toBe(START_FEN)
    expect(state.selected).toBeNull()
  })

  it("auto-queens when applying a promotion destination", () => {
    const before = "8/P7/8/8/8/8/8/4K2k w - - 0 1"
    const after = "Q7/8/8/8/8/8/8/4K2k b - - 0 1"
    const promoMoves = ["a7a8q", "a7a8r", "a7a8b", "a7a8n", "e1d1", "e1d2", "e1e2", "e1f1", "e1f2"]
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(promoMoves),
      applyMove: vi.fn().mockReturnValue(after),
    }
    const play = createLocalPlayController(rules, before)
    play.selectSquare("a7")
    const state = play.selectSquare("a8")
    expect(rules.applyMove).toHaveBeenCalledWith(before, "a7a8q")
    expect(state.fen).toBe(after)
    expect(state.lastUci).toBe("a7a8q")
  })

  it("does not select an opponent piece on an empty selection", () => {
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(startMoves),
      applyMove: vi.fn(),
    }
    const play = createLocalPlayController(rules)
    const state = play.selectSquare("e7")
    expect(state.selected).toBeNull()
    expect(state.legalDests).toEqual([])
  })
})
