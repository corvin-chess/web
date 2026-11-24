/**
 * Monotonic game seq ordering per PROTOCOL.md:
 * apply when seq == last+1; buffer ahead; ignore duplicates; resync if buffer > 50.
 */

export type SeqIngestResult = "applied" | "duplicate" | "buffered" | "resync"

export type SeqTrackerOptions = {
  onApply: (seq: number, payload?: unknown) => void
  onResync?: () => void
  maxBuffer?: number
}

export class SeqTracker {
  private last = 0
  private buffer = new Map<number, unknown>()
  private readonly onApply: SeqTrackerOptions["onApply"]
  private readonly onResync: (() => void) | undefined
  private readonly maxBuffer: number

  constructor(opts: SeqTrackerOptions) {
    this.onApply = opts.onApply
    this.onResync = opts.onResync
    this.maxBuffer = opts.maxBuffer ?? 50
  }

  get lastSeq(): number {
    return this.last
  }

  resetFromSnapshot(seq: number) {
    if (!Number.isInteger(seq) || seq < 0) {
      throw new Error("snapshot seq must be a non-negative integer")
    }
    this.last = seq
    this.buffer.clear()
  }

  noteApplied(seq: number) {
    if (seq > this.last) this.last = seq
  }

  /** Hard-set lastSeq (game switch / new resume target); clears the ahead buffer. */
  resetTo(seq: number) {
    if (!Number.isInteger(seq) || seq < 0) {
      throw new Error("seq must be a non-negative integer")
    }
    this.last = seq
    this.buffer.clear()
  }

  ingest(seq: number, payload?: unknown): SeqIngestResult {
    if (!Number.isInteger(seq) || seq < 1) {
      return "duplicate"
    }
    if (seq <= this.last) return "duplicate"
    if (seq === this.last + 1) {
      this.applyOne(seq, payload)
      this.drain()
      return "applied"
    }
    this.buffer.set(seq, payload)
    if (this.buffer.size > this.maxBuffer) {
      this.buffer.clear()
      this.onResync?.()
      return "resync"
    }
    return "buffered"
  }

  private applyOne(seq: number, payload: unknown) {
    this.last = seq
    this.onApply(seq, payload)
  }

  private drain() {
    while (this.buffer.has(this.last + 1)) {
      const next = this.last + 1
      const payload = this.buffer.get(next)
      this.buffer.delete(next)
      this.applyOne(next, payload)
    }
  }
}
