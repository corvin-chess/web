import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_PLAY_PREFS } from "./playPrefs"
import {
  playSound,
  resetSoundPlayerForTests,
  unlockSoundPlayer,
} from "./soundPlayer"

describe("soundPlayer", () => {
  const play = vi.fn(() => Promise.resolve())
  const pause = vi.fn()

  beforeEach(() => {
    resetSoundPlayerForTests()
    play.mockClear()
    pause.mockClear()
    vi.stubGlobal(
      "Audio",
      vi.fn(() => ({
        preload: "",
        muted: false,
        currentTime: 0,
        play,
        pause,
      }))
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    resetSoundPlayerForTests()
  })

  it("does not play when master muted", () => {
    playSound("move", { ...DEFAULT_PLAY_PREFS, soundMuted: true })
    expect(play).not.toHaveBeenCalled()
  })

  it("does not play when event disabled", () => {
    playSound("offer", {
      ...DEFAULT_PLAY_PREFS,
      soundEvents: { ...DEFAULT_PLAY_PREFS.soundEvents, offer: false },
    })
    expect(play).not.toHaveBeenCalled()
  })

  it("plays when enabled", () => {
    playSound("capture", DEFAULT_PLAY_PREFS)
    expect(play).toHaveBeenCalledTimes(1)
  })

  it("unlock warms buffers after gesture", () => {
    unlockSoundPlayer()
    expect(play).toHaveBeenCalled()
  })
})
