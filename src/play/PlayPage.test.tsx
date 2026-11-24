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

vi.mock("../chess/wasmRules", () => ({
  loadWasmRules: vi.fn(),
}))

import { authApi } from "../auth/api"
import { loadWasmRules } from "../chess/wasmRules"

beforeEach(() => {
  vi.mocked(authApi.getSession).mockResolvedValue(null)
  vi.mocked(loadWasmRules).mockResolvedValue({
    legalMoves: () => [
      "e2e3",
      "e2e4",
      "a2a3",
      "a2a4",
      "b2b3",
      "b2b4",
      "c2c3",
      "c2c4",
      "d2d3",
      "d2d4",
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
    ],
    applyMove: () =>
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  })
})

describe("PlayPage", () => {
  it("renders lobby + local board when signed out", async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <PlayPage />
        </AuthProvider>
      </MemoryRouter>
    )
    const main = screen.getByRole("main", { name: "Play" })
    expect(main).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Play" })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole("grid", { name: "Chess board" })).toBeInTheDocument()
    })
    expect(screen.getByRole("region", { name: "Local board" })).toBeInTheDocument()
    expect(screen.getByRole("region", { name: "Lobby" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /quick pair/i })).toBeDisabled()
    expect(loadWasmRules).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument()
    })
  })

  it("shows signed-in lobby gated until WS ready", async () => {
    vi.mocked(authApi.getSession).mockResolvedValue({
      userId: "u1",
      username: "Alice",
      csrfToken: "csrf",
      dmEnabled: true,
      publicChatEnabled: true,
    })
    render(
      <MemoryRouter>
        <AuthProvider>
          <PlayPage />
        </AuthProvider>
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument()
    })
    // Without a live server, the client stays reconnecting; quick pair stays gated.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /quick pair/i })).toBeDisabled()
    })
    expect(screen.getByText(/matchmaking unavailable/i)).toBeInTheDocument()
  })


  it("shows an alert when WASM rules fail to load", async () => {
    vi.mocked(loadWasmRules).mockRejectedValueOnce(new Error("boom"))
    render(
      <MemoryRouter>
        <AuthProvider>
          <PlayPage />
        </AuthProvider>
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Could not load chess rules.")
    })
  })
})
