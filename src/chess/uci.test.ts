import { describe, expect, it } from "vitest"
import { parseUci, pickUci, uciFromTo } from "./uci"

describe("uci helpers", () => {
  it("parses quiet and promotion UCI", () => {
    expect(parseUci("e2e4")).toEqual({ from: "e2", to: "e4", promotion: null })
    expect(parseUci("a7a8q")).toEqual({ from: "a7", to: "a8", promotion: "q" })
    expect(parseUci("e2e")).toBeNull()
    expect(parseUci("e2e4x")).toBeNull()
  })

  it("picks queen among promotion choices", () => {
    const moves = ["a7a8q", "a7a8r", "a7a8b", "a7a8n"]
    expect(pickUci(moves, "a7", "a8")).toBe("a7a8q")
    expect(pickUci(moves, "a7", "b8")).toBeNull()
    expect(uciFromTo("e2", "e4")).toBe("e2e4")
  })
})
