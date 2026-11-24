import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthPage } from "./AuthPage"
import { AuthProvider } from "./AuthProvider"

vi.mock("./api", () => ({
  authApi: {
    getSession: vi.fn().mockResolvedValue(null),
    otpStart: vi.fn().mockResolvedValue(undefined),
    otpVerify: vi.fn().mockResolvedValue({
      userId: "u1",
      username: "Raven",
      csrfToken: "csrf",
      dmEnabled: true,
      publicChatEnabled: true,
    }),
    passkeyRegisterStart: vi.fn(),
    passkeyRegisterFinish: vi.fn(),
    passkeyLoginStart: vi.fn(),
    passkeyLoginFinish: vi.fn(),
    logout: vi.fn(),
  },
}))

import { authApi } from "./api"

const renderAuth = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/play" element={<main aria-label="Play">play</main>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

beforeEach(() => {
  vi.mocked(authApi.getSession).mockResolvedValue(null)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("AuthPage", () => {
  it("renders accessible login shell with passkey and email methods", async () => {
    renderAuth()
    await waitFor(() => {
      expect(screen.getByRole("main", { name: /sign in/i })).toBeInTheDocument()
    })
    expect(screen.getByRole("heading", { level: 1, name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^sign in$/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByRole("button", { name: /^passkey$/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
  })

  it("email OTP start then verify navigates after mocked login", async () => {
    renderAuth()
    await waitFor(() => screen.getByRole("main", { name: /sign in/i }))

    fireEvent.click(screen.getByRole("button", { name: /^email code$/i }))
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: "raven@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /send code/i }))

    await waitFor(() => {
      expect(authApi.otpStart).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: "login",
          email: "raven@example.com",
        })
      )
    })

    fireEvent.change(screen.getByLabelText(/one-time code/i), {
      target: { value: "123456" },
    })
    fireEvent.click(screen.getByRole("button", { name: /verify and continue/i }))

    await waitFor(() => {
      expect(authApi.otpVerify).toHaveBeenCalledWith({
        purpose: "login",
        email: "raven@example.com",
        code: "123456",
      })
      expect(screen.getByRole("main", { name: "Play" })).toBeInTheDocument()
    })
  })

  it("shows signed-in state with logout when session exists", async () => {
    vi.mocked(authApi.getSession).mockResolvedValue({
      userId: "u1",
      username: "Raven",
      csrfToken: "csrf",
      dmEnabled: true,
      publicChatEnabled: true,
    })
    renderAuth()
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/signed in as raven/i)
    })
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument()
  })
})
