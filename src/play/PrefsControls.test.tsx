import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { getPlayShellStrings } from "../locales"
import { DEFAULT_PLAY_PREFS } from "./playPrefs"
import { PrefsControls } from "./PrefsControls"

describe("PrefsControls", () => {
  it("exposes theme select and sound mute with accessible labels", () => {
    const onChange = vi.fn()
    const strings = getPlayShellStrings("en").prefs
    render(
      <PrefsControls
        strings={strings}
        prefs={DEFAULT_PLAY_PREFS}
        onChange={onChange}
      />
    )
    expect(screen.getByLabelText(strings.theme)).toBeInTheDocument()
    expect(screen.getByLabelText(strings.title)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(strings.theme), {
      target: { value: "dark" },
    })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "dark" })
    )
    fireEvent.click(screen.getByRole("checkbox", { name: strings.soundMute }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ soundMuted: true })
    )
  })

  it("toggles a per-event sound flag", () => {
    const onChange = vi.fn()
    const strings = getPlayShellStrings("en").prefs
    render(
      <PrefsControls
        strings={strings}
        prefs={DEFAULT_PLAY_PREFS}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole("checkbox", { name: strings.soundOffer }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        soundEvents: expect.objectContaining({ offer: false }),
      })
    )
  })
})
