import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

// jsdom does not implement HTMLMediaElement.play; stub for CV-198 SFX.
class MockAudio {
  preload = ""
  muted = false
  currentTime = 0
  src = ""
  constructor(src?: string) {
    if (src) this.src = src
  }
  play = () => Promise.resolve()
  pause = () => undefined
}

vi.stubGlobal("Audio", MockAudio)

afterEach(() => {
  cleanup()
})
