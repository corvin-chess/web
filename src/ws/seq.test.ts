import { describe, expect, it } from "vitest"
import { SeqTracker } from "./seq"

describe("SeqTracker", () => {
  it("applies contiguous seq and ignores duplicates", () => {
    const applied: number[] = []
    const tracker = new SeqTracker({
      onApply: (seq) => {
        applied.push(seq)
      },
    })

    expect(tracker.ingest(1)).toBe("applied")
    expect(tracker.ingest(1)).toBe("duplicate")
    expect(tracker.ingest(2)).toBe("applied")
    expect(applied).toEqual([1, 2])
    expect(tracker.lastSeq).toBe(2)
  })

  it("buffers out-of-order then drains when gap fills", () => {
    const applied: number[] = []
    const tracker = new SeqTracker({
      onApply: (seq) => {
        applied.push(seq)
      },
    })

    expect(tracker.ingest(1)).toBe("applied")
    expect(tracker.ingest(3)).toBe("buffered")
    expect(tracker.ingest(4)).toBe("buffered")
    expect(tracker.ingest(2)).toBe("applied")
    expect(applied).toEqual([1, 2, 3, 4])
    expect(tracker.lastSeq).toBe(4)
  })

  it("requests resync when buffer exceeds 50", () => {
    let resync = 0
    const tracker = new SeqTracker({
      onApply: () => {},
      onResync: () => {
        resync += 1
      },
    })

    expect(tracker.ingest(1)).toBe("applied")
    // 50 buffered ahead of last+1 (seqs 3..52); 51st forces resync per PROTOCOL.
    for (let s = 3; s <= 52; s += 1) {
      expect(tracker.ingest(s)).toBe("buffered")
    }
    expect(tracker.ingest(53)).toBe("resync")
    expect(resync).toBe(1)
  })

  it("resetFromSnapshot sets lastSeq and clears buffer", () => {
    const applied: number[] = []
    const tracker = new SeqTracker({
      onApply: (seq) => {
        applied.push(seq)
      },
    })
    tracker.ingest(1)
    tracker.ingest(3)
    tracker.resetFromSnapshot(10)
    expect(tracker.lastSeq).toBe(10)
    expect(tracker.ingest(10)).toBe("duplicate")
    expect(tracker.ingest(11)).toBe("applied")
    expect(applied).toEqual([1, 11])
  })

  it("resetTo can lower lastSeq for a new game", () => {
    const tracker = new SeqTracker({ onApply: () => {} })
    tracker.ingest(1)
    tracker.ingest(2)
    tracker.resetTo(0)
    expect(tracker.lastSeq).toBe(0)
    expect(tracker.ingest(1)).toBe("applied")
  })
})
