import { describe, expect, it } from "vitest"
import {
  initialOnlineSession,
  isMyTurn,
  reduceOnlineSession,
} from "./onlineSession"

const start = () =>
  reduceOnlineSession(initialOnlineSession(), {
    typ: "GameStart",
    gameId: "g1",
    color: "w",
    config: {
      timeClass: "blitz",
      initialMs: 300_000,
      incrementMs: 2000,
      rated: true,
    },
    opponents: { w: "u1", b: "u2" },
    startClocks: { w: 300_000, b: 300_000 },
    serverTime: 1000,
  })

describe("reduceOnlineSession", () => {
  it("moves idle → pairing → playing on QuickPair + GameStart", () => {
    let s = reduceOnlineSession(initialOnlineSession(), { typ: "QuickPairSent" })
    expect(s.phase).toBe("pairing")
    s = start()
    expect(s.phase).toBe("playing")
    expect(s.myColor).toBe("w")
    expect(s.gameId).toBe("g1")
    expect(isMyTurn(s)).toBe(true)
  })

  it("applies MoveApplied fen/clocks and clears pending offer", () => {
    let s = start()
    s = reduceOnlineSession(s, {
      typ: "OfferState",
      gameId: "g1",
      offer: "draw",
      by: "b",
      status: "offered",
      seq: 1,
    })
    expect(s.pendingOffer?.offer).toBe("draw")
    s = reduceOnlineSession(s, {
      typ: "MoveApplied",
      gameId: "g1",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      clocks: { w: 298_000, b: 300_000 },
      active: "b",
      seq: 2,
      serverTime: 2000,
      san: "e4",
    })
    expect(s.fen).toContain("4P3")
    expect(s.pendingOffer).toBeNull()
    expect(s.lastSeq).toBe(2)
    expect(isMyTurn(s)).toBe(false)
  })

  it("ends on GameEnd and ignores foreign game_id", () => {
    let s = start()
    s = reduceOnlineSession(s, {
      typ: "GameEnd",
      gameId: "other",
      result: "1-0",
      reason: "resign",
      winner: "w",
    })
    expect(s.phase).toBe("playing")
    s = reduceOnlineSession(s, {
      typ: "GameEnd",
      gameId: "g1",
      result: "0-1",
      reason: "resign",
      winner: "b",
      seq: 3,
      ratingDiff: { w: -8, b: 8 },
    })
    expect(s.phase).toBe("ended")
    expect(s.end?.winner).toBe("b")
    expect(s.end?.ratingDiff?.b).toBe(8)
  })

  it("cancel pairing returns idle", () => {
    const s = reduceOnlineSession(
      reduceOnlineSession(initialOnlineSession(), { typ: "QuickPairSent" }),
      { typ: "QuickPairCancel" }
    )
    expect(s.phase).toBe("idle")
  })

  it("ignores MoveApplied after GameEnd", () => {
    let s = start()
    s = reduceOnlineSession(s, {
      typ: "GameEnd",
      gameId: "g1",
      result: "1-0",
      reason: "resign",
      winner: "w",
      seq: 1,
    })
    s = reduceOnlineSession(s, {
      typ: "MoveApplied",
      gameId: "g1",
      fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
      clocks: { w: 1, b: 1 },
      active: "b",
      seq: 2,
      serverTime: 3000,
      san: "e4",
    })
    expect(s.phase).toBe("ended")
    expect(s.fen).toContain("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")
  })
})
