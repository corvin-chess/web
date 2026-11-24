import { beforeEach, describe, expect, it } from "vitest"
import {
  DEFAULT_PLAY_PREFS,
  isSoundEnabled,
  loadPlayPrefs,
  savePlayPrefs,
  type PlayPrefs,
} from "./playPrefs"

describe("playPrefs", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("returns defaults when storage is empty", () => {
    expect(loadPlayPrefs()).toEqual(DEFAULT_PLAY_PREFS)
    expect(DEFAULT_PLAY_PREFS.confirmMoves).toBe(false)
    expect(DEFAULT_PLAY_PREFS.theme).toBe("system")
    expect(DEFAULT_PLAY_PREFS.soundMuted).toBe(false)
    expect(DEFAULT_PLAY_PREFS.soundEvents.move).toBe(true)
  })

  it("persists confirmMoves toggle", () => {
    const next: PlayPrefs = { ...DEFAULT_PLAY_PREFS, confirmMoves: true }
    savePlayPrefs(next)
    expect(loadPlayPrefs()).toEqual(next)
  })

  it("persists theme and sound toggles", () => {
    const next: PlayPrefs = {
      ...DEFAULT_PLAY_PREFS,
      theme: "dark",
      soundMuted: true,
      soundEvents: {
        ...DEFAULT_PLAY_PREFS.soundEvents,
        offer: false,
      },
    }
    savePlayPrefs(next)
    expect(loadPlayPrefs()).toEqual(next)
  })

  it("migrates legacy confirm-only JSON with theme/sound defaults", () => {
    window.localStorage.setItem(
      "corvin.play.prefs",
      JSON.stringify({ confirmMoves: true })
    )
    const loaded = loadPlayPrefs()
    expect(loaded.confirmMoves).toBe(true)
    expect(loaded.theme).toBe("system")
    expect(loaded.soundMuted).toBe(false)
    expect(loaded.soundEvents.capture).toBe(true)
  })

  it("ignores corrupt JSON and returns defaults", () => {
    window.localStorage.setItem("corvin.play.prefs", "{not-json")
    expect(loadPlayPrefs()).toEqual(DEFAULT_PLAY_PREFS)
  })

  it("gates SFX with master mute and per-event flags", () => {
    expect(isSoundEnabled(DEFAULT_PLAY_PREFS, "move")).toBe(true)
    expect(
      isSoundEnabled({ ...DEFAULT_PLAY_PREFS, soundMuted: true }, "move")
    ).toBe(false)
    expect(
      isSoundEnabled(
        {
          ...DEFAULT_PLAY_PREFS,
          soundEvents: { ...DEFAULT_PLAY_PREFS.soundEvents, check: false },
        },
        "check"
      )
    ).toBe(false)
  })
})
