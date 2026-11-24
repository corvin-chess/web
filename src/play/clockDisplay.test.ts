import { describe, expect, it } from "vitest"
import {
  displayRemainingMs,
  formatClockMs,
  isLowTime,
  type ClockBaseline,
} from "./clockDisplay"

const base: ClockBaseline = {
  clocks: { w: 60_000, b: 45_000 },
  active: "w",
  serverTime: 1_000_000,
}

describe("displayRemainingMs", () => {
  it("ticks only the active side", () => {
    expect(displayRemainingMs(base, "w", 1_010_000)).toBe(50_000)
    expect(displayRemainingMs(base, "b", 1_010_000)).toBe(45_000)
  })

  it("clamps at zero", () => {
    expect(displayRemainingMs(base, "w", 1_100_000)).toBe(0)
  })

  it("does not go negative when serverTime is ahead", () => {
    expect(displayRemainingMs(base, "w", 999_000)).toBe(60_000)
  })
})

describe("formatClockMs", () => {
  it("formats under an hour as M:SS", () => {
    expect(formatClockMs(125_000)).toBe("2:05")
    expect(formatClockMs(999)).toBe("0:01")
    expect(formatClockMs(0)).toBe("0:00")
  })

  it("formats long games with hours", () => {
    expect(formatClockMs(3_661_000)).toBe("1:01:01")
  })
})

describe("isLowTime", () => {
  it("matches DESIGN 20s threshold", () => {
    expect(isLowTime(20_000)).toBe(true)
    expect(isLowTime(20_001)).toBe(false)
  })
})
