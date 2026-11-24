import { describe, expect, it } from "vitest"
import { geometricPremoveDests } from "./premoveGeometry"
import { START_FEN } from "../chess/types"

describe("geometricPremoveDests", () => {
  it("lists white pawn forward and capture squares from e2", () => {
    const dests = geometricPremoveDests(START_FEN, "e2", "w")
    expect(dests).toEqual(expect.arrayContaining(["e3", "e4", "d3", "f3"]))
    expect(dests).not.toContain("e2")
  })

  it("lists knight jumps from b1 onto empty squares only", () => {
    const dests = geometricPremoveDests(START_FEN, "b1", "w")
    expect(dests.sort()).toEqual(["a3", "c3"])
  })

  it("returns empty when square is empty or opponent piece", () => {
    expect(geometricPremoveDests(START_FEN, "e4", "w")).toEqual([])
    expect(geometricPremoveDests(START_FEN, "e7", "w")).toEqual([])
  })

  it("includes king castle destinations when rook is home", () => {
    // Adjacent start squares are occupied by own pieces; castling targets remain.
    const dests = geometricPremoveDests(START_FEN, "e1", "w")
    expect(dests.sort()).toEqual(["c1", "g1"])
  })

  it("stops rook rays before own pieces and allows capture squares of foes", () => {
    // White king on e2 (off the a1-h1 ray); black rook on h1 is capturable.
    const fen = "4k3/8/8/8/8/8/4K3/R6r w - - 0 1"
    const dests = geometricPremoveDests(fen, "a1", "w")
    expect(dests).toEqual(
      expect.arrayContaining(["a2", "a8", "b1", "c1", "d1", "e1", "h1"])
    )
    expect(dests).not.toContain("e2")
  })
})
