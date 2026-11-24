import { describe, expect, it, vi } from "vitest"
import { formatMoveAnnouncement, sanForUci } from "./announceSan"

describe("formatMoveAnnouncement", () => {
  it("interpolates locale SAN into moveAnnounced", () => {
    expect(formatMoveAnnouncement("{san}", "Nf3")).toBe("Nf3")
    expect(formatMoveAnnouncement("Mossa {san}", "O-O")).toBe("Mossa O-O")
  })
})

describe("sanForUci", () => {
  it("returns SAN from toSan when available", () => {
    const toSan = vi.fn().mockReturnValue("e4")
    expect(sanForUci(toSan, "fen", "e2e4")).toBe("e4")
    expect(toSan).toHaveBeenCalledWith("fen", "e2e4")
  })

  it("falls back to UCI when toSan is absent or throws", () => {
    expect(sanForUci(undefined, "fen", "e2e4")).toBe("e2e4")
    expect(
      sanForUci(() => {
        throw new Error("bad")
      }, "fen", "g1f3")
    ).toBe("g1f3")
  })

  it("falls back to UCI when toSan returns blank", () => {
    expect(sanForUci(() => "  ", "fen", "e2e4")).toBe("e2e4")
  })
})
