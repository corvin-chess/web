import { describe, expect, it } from "vitest"

/**
 * Mirrors PlayPage move-SFX gate: play only when SAN changes with seq,
 * not when seq bumps alone (OfferState / GameEnd).
 */
const shouldPlayMoveSound = (
  prevKey: string,
  seq: number,
  san: string | null
): { play: boolean; nextKey: string } => {
  if (!san || seq <= 0) return { play: false, nextKey: prevKey }
  const key = `${seq}:${san}`
  if (key === prevKey) return { play: false, nextKey: prevKey }
  const prevSan = prevKey.includes(":")
    ? prevKey.slice(prevKey.indexOf(":") + 1)
    : ""
  if (prevKey && san === prevSan) return { play: false, nextKey: key }
  return { play: true, nextKey: key }
}

describe("move sound gate", () => {
  it("plays on first MoveApplied", () => {
    expect(shouldPlayMoveSound("", 1, "e4")).toEqual({
      play: true,
      nextKey: "1:e4",
    })
  })

  it("skips offer seq bump that keeps SAN", () => {
    expect(shouldPlayMoveSound("1:e4", 2, "e4")).toEqual({
      play: false,
      nextKey: "2:e4",
    })
  })

  it("plays when a later ply brings a new SAN", () => {
    expect(shouldPlayMoveSound("2:e4", 3, "e5")).toEqual({
      play: true,
      nextKey: "3:e5",
    })
  })
})
