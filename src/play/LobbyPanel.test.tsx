import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { getPlayShellStrings } from "../locales"
import { LobbyPanel } from "./LobbyPanel"
import { defaultPreset } from "./timePresets"

describe("LobbyPanel", () => {
  it("fires quick pair when enabled", () => {
    const onQuickPair = vi.fn()
    render(
      <LobbyPanel
        strings={getPlayShellStrings("en")}
        pairing={false}
        disabled={false}
        onQuickPair={onQuickPair}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /quick pair/i }))
    expect(onQuickPair).toHaveBeenCalledWith(
      defaultPreset(),
      true,
      "random"
    )
  })
})
