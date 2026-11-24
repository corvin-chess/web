import { describe, expect, it, vi } from "vitest"
import {
  clearPremoveIfIllegal,
  pendingFromSquares,
  resolvePendingPremove,
  type PendingPremove,
} from "./premove"
import type { ChessRules } from "../chess/types"

describe("pendingFromSquares", () => {
  it("builds a pending premove with optional promo", () => {
    expect(pendingFromSquares("e2", "e4")).toEqual({
      from: "e2",
      to: "e4",
      uci: "e2e4",
    })
    expect(pendingFromSquares("a7", "a8", "q")).toEqual({
      from: "a7",
      to: "a8",
      uci: "a7a8q",
    })
  })
})

describe("resolvePendingPremove", () => {
  const pending: PendingPremove = { from: "d4", to: "e5", uci: "d4e5" }

  it("returns matching legal UCI when still legal (prefers queen promo)", () => {
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(["d4e5", "a2a3"]),
      applyMove: vi.fn(),
    }
    expect(resolvePendingPremove(rules, "fen", pending)).toBe("d4e5")
  })

  it("returns null when no longer legal after opponent move", () => {
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(["a2a3", "b2b3"]),
      applyMove: vi.fn(),
    }
    expect(resolvePendingPremove(rules, "fen", pending)).toBeNull()
  })

  it("resolves promotion premove to queen when several promos share from-to", () => {
    const promo: PendingPremove = { from: "a7", to: "a8", uci: "a7a8q" }
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(["a7a8q", "a7a8r", "a7a8b", "a7a8n"]),
      applyMove: vi.fn(),
    }
    expect(resolvePendingPremove(rules, "fen", promo)).toBe("a7a8q")
  })
})

describe("clearPremoveIfIllegal", () => {
  it("keeps pending when resolve succeeds", () => {
    const pending: PendingPremove = { from: "e7", to: "e5", uci: "e7e5" }
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(["e7e5"]),
      applyMove: vi.fn(),
    }
    expect(clearPremoveIfIllegal(rules, "fen", pending)).toEqual(pending)
  })

  it("clears pending when illegal", () => {
    const pending: PendingPremove = { from: "e7", to: "e5", uci: "e7e5" }
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue([]),
      applyMove: vi.fn(),
    }
    expect(clearPremoveIfIllegal(rules, "fen", pending)).toBeNull()
  })
})
