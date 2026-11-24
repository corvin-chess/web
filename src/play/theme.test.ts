import { beforeEach, describe, expect, it } from "vitest"
import { applyTheme, readThemeAttr } from "./theme"

describe("applyTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme")
  })

  it("sets light and dark explicitly", () => {
    applyTheme("light")
    expect(readThemeAttr()).toBe("light")
    applyTheme("dark")
    expect(readThemeAttr()).toBe("dark")
  })

  it("clears data-theme for system so CSS can follow prefers-color-scheme", () => {
    applyTheme("dark")
    applyTheme("system")
    expect(readThemeAttr()).toBeNull()
  })
})
