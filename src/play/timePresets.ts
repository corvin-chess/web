/** Quick-pair presets (CV-194). Values match common PROTOCOL time classes. */

export type TimePresetId = "bullet" | "blitz" | "rapid"

export type TimePreset = {
  id: TimePresetId
  timeClass: string
  initialMs: number
  incrementMs: number
}

export const TIME_PRESETS: readonly TimePreset[] = [
  { id: "bullet", timeClass: "bullet", initialMs: 60_000, incrementMs: 0 },
  { id: "blitz", timeClass: "blitz", initialMs: 300_000, incrementMs: 2_000 },
  { id: "rapid", timeClass: "rapid", initialMs: 600_000, incrementMs: 0 },
]

export const defaultPreset = (): TimePreset => TIME_PRESETS[1]!
