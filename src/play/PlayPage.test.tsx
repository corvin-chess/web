import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { AuthProvider } from "../auth/AuthProvider"
import { PlayPage } from "./PlayPage"

vi.mock("../auth/api", () => ({
  authApi: {
    getSession: vi.fn().mockResolvedValue(null),
    logout: vi.fn(),
  },
}))

import { authApi } from "../auth/api"

beforeEach(() => {
  vi.mocked(authApi.getSession).mockResolvedValue(null)
})

describe("PlayPage", () => {
  it("renders a blank main landmark labeled Play with a heading", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <PlayPage />
        </AuthProvider>
      </MemoryRouter>
    )
    const main = screen.getByRole("main", { name: "Play" })
    expect(main).toBeInTheDocument()
    expect(main.className).toContain("play-shell")
    expect(screen.getByRole("heading", { level: 1, name: "Play" })).toBeInTheDocument()
    expect(main.querySelector(".play-board, canvas, svg")).toBeNull()
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument()
    })
  })
})
