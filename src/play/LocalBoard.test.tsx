import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { LocalBoard } from "./LocalBoard"
import type { ChessRules } from "../chess/types"

const startMoves = [
  "a2a3",
  "a2a4",
  "b2b3",
  "b2b4",
  "c2c3",
  "c2c4",
  "d2d3",
  "d2d4",
  "e2e3",
  "e2e4",
  "f2f3",
  "f2f4",
  "g2g3",
  "g2g4",
  "h2h3",
  "h2h4",
  "b1a3",
  "b1c3",
  "g1f3",
  "g1h3",
]

describe("LocalBoard", () => {
  it("highlights legal destinations then applies e2e4", () => {
    const after =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(startMoves),
      applyMove: vi.fn().mockReturnValue(after),
      toSan: vi.fn().mockReturnValue("e4"),
    }
    const announce = vi.fn()
    render(<LocalBoard rules={rules} announce={announce} />)

    expect(document.getElementById("corvin-sq-e2")).toBeTruthy()

    fireEvent.click(document.getElementById("corvin-sq-e2")!)
    expect(document.querySelector(".corvin-sq--legal")).toBeTruthy()
    expect(announce).toHaveBeenCalledWith(
      expect.stringMatching(/Selected e2/)
    )

    // setFen replaces the square nodes; re-query before the destination click.
    fireEvent.click(document.getElementById("corvin-sq-e4")!)
    expect(rules.applyMove).toHaveBeenCalledWith(expect.any(String), "e2e4")
    expect(screen.getByRole("status")).toHaveTextContent("Played e4")
    expect(announce).toHaveBeenCalledWith("e4")
  })

  it("applies a move via keyboard Enter on focus squares", () => {
    const after =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(startMoves),
      applyMove: vi.fn().mockReturnValue(after),
      toSan: vi.fn().mockReturnValue("e4"),
    }
    const announce = vi.fn()
    render(<LocalBoard rules={rules} announce={announce} />)
    const boardEl = () => screen.getByRole("grid", { name: "Chess board" })
    boardEl().focus()

    // Default focus is e2; Enter selects it. Re-query after each paint.
    fireEvent.keyDown(boardEl(), { key: "Enter" })
    expect(document.querySelector(".corvin-sq--legal")).toBeTruthy()

    // ArrowUp (white orientation) moves focus from e2 → e3 → e4.
    fireEvent.keyDown(boardEl(), { key: "ArrowUp" })
    fireEvent.keyDown(boardEl(), { key: "ArrowUp" })
    fireEvent.keyDown(boardEl(), { key: "Enter" })
    expect(rules.applyMove).toHaveBeenCalledWith(expect.any(String), "e2e4")
    expect(screen.getByRole("status")).toHaveTextContent("Played e4")
    expect(announce).toHaveBeenCalledWith("e4")
  })

  it("Escape clears a keyboard selection", () => {
    const rules: ChessRules = {
      legalMoves: vi.fn().mockReturnValue(startMoves),
      applyMove: vi.fn(),
      toSan: vi.fn(),
    }
    render(<LocalBoard rules={rules} />)
    const boardEl = () => screen.getByRole("grid", { name: "Chess board" })
    boardEl().focus()
    fireEvent.keyDown(boardEl(), { key: "Enter" })
    expect(document.querySelector(".corvin-sq--legal")).toBeTruthy()
    fireEvent.keyDown(boardEl(), { key: "Escape" })
    expect(document.querySelector(".corvin-sq--legal")).toBeFalsy()
    expect(screen.getByRole("status")).toHaveTextContent(/Select a piece/i)
  })
})
