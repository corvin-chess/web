import { beforeEach, describe, expect, it } from "vitest"
import {
  DEFAULT_PLAY_PREFS,
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
  })

  it("persists confirmMoves toggle", () => {
    const next: PlayPrefs = { confirmMoves: true }
    savePlayPrefs(next)
    expect(loadPlayPrefs()).toEqual(next)
  })

  it("ignores corrupt JSON and returns defaults", () => {
    window.localStorage.setItem("corvin.play.prefs", "{not-json")
    expect(loadPlayPrefs()).toEqual(DEFAULT_PLAY_PREFS)
  })
})
