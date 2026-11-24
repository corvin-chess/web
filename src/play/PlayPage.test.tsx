import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PlayPage } from "./PlayPage"

describe("PlayPage", () => {
  it("renders a blank main landmark labeled Play with a heading", () => {
    render(<PlayPage />)
    const main = screen.getByRole("main", { name: "Play" })
    expect(main).toBeInTheDocument()
    expect(main.className).toContain("play-shell")
    expect(screen.getByRole("heading", { level: 1, name: "Play" })).toBeInTheDocument()
    expect(main.querySelector(".play-board, canvas, svg")).toBeNull()
  })
})
