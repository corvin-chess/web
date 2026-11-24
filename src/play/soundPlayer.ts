/**
 * Play SFX from /sounds/*.wav with mute/prefs gates (CV-198).
 * Browsers block autoplay until a user gesture; call unlock() from UI handlers.
 */

import { isSoundEnabled, loadPlayPrefs, type PlayPrefs } from "./playPrefs"
import type { SoundEvent } from "./soundEvent"
import { SOUND_EVENTS } from "./soundEvent"

const FILE_FOR: Record<SoundEvent, string> = {
  move: "/sounds/move.wav",
  capture: "/sounds/capture.wav",
  check: "/sounds/check.wav",
  "game-end": "/sounds/game-end.wav",
  offer: "/sounds/offer.wav",
}

let unlocked = false
const cache = new Map<SoundEvent, HTMLAudioElement>()

const getAudio = (event: SoundEvent): HTMLAudioElement | null => {
  if (typeof Audio === "undefined") return null
  let el = cache.get(event)
  if (!el) {
    el = new Audio(FILE_FOR[event])
    el.preload = "auto"
    cache.set(event, el)
  }
  return el
}

const safePlay = (el: HTMLAudioElement): Promise<void> => {
  try {
    const result = el.play()
    if (result && typeof (result as Promise<void>).then === "function") {
      return result as Promise<void>
    }
    return Promise.resolve()
  } catch {
    return Promise.resolve()
  }
}

/** Warm buffers after a user gesture so later plies are not blocked. */
export const unlockSoundPlayer = (): void => {
  if (unlocked || typeof Audio === "undefined") return
  unlocked = true
  for (const event of SOUND_EVENTS) {
    const el = getAudio(event)
    if (!el) continue
    el.muted = true
    void safePlay(el).then(() => {
      el.pause()
      el.currentTime = 0
      el.muted = false
    })
  }
}

export const playSound = (
  event: SoundEvent,
  prefs: PlayPrefs = loadPlayPrefs()
): void => {
  if (!isSoundEnabled(prefs, event)) return
  const el = getAudio(event)
  if (!el) return
  el.currentTime = 0
  void safePlay(el)
}

/** Test helper: reset unlock + cache between suites. */
export const resetSoundPlayerForTests = (): void => {
  unlocked = false
  cache.clear()
}
