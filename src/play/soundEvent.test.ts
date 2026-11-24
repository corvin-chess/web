import { describe, expect, it } from "vitest"
import { soundEventFromSan } from "./soundEvent"

describe("soundEventFromSan", () => {
  it("classifies quiet moves", () => {
    expect(soundEventFromSan("e4")).toBe("move")
    expect(soundEventFromSan("O-O")).toBe("move")
    expect(soundEventFromSan("e8=Q")).toBe("move")
  })

  it("classifies captures", () => {
    expect(soundEventFromSan("Nxe5")).toBe("capture")
    expect(soundEventFromSan("exd5")).toBe("capture")
  })

  it("prefers check over capture", () => {
    expect(soundEventFromSan("Qxe5+")).toBe("check")
    expect(soundEventFromSan("Qh5#")).toBe("check")
    expect(soundEventFromSan("Nf7+")).toBe("check")
  })

  it("treats blank as move", () => {
    expect(soundEventFromSan("")).toBe("move")
    expect(soundEventFromSan("   ")).toBe("move")
  })
})
