import { afterEach, describe, expect, it, vi } from "vitest"
import { authApi } from "./api"

const jsonResponse = (status: number, body: unknown, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("authApi OTP", () => {
  it("starts OTP with PROTOCOL path and credentials include", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    await authApi.otpStart({
      purpose: "login",
      email: "player@example.com",
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/v1/auth/email/otp/start")
    expect(init.method).toBe("POST")
    expect(init.credentials).toBe("include")
    expect(JSON.parse(String(init.body))).toEqual({
      purpose: "login",
      email: "player@example.com",
      username: undefined,
      birth_year: undefined,
      locale: undefined,
    })
  })

  it("verifies OTP and maps AuthSuccess session fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        user_id: "01HX",
        username: "Raven",
        csrf_token: "abc",
        dm_enabled: true,
        public_chat_enabled: false,
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const session = await authApi.otpVerify({
      purpose: "register",
      email: "raven@example.com",
      code: "123456",
    })

    expect(session).toEqual({
      userId: "01HX",
      username: "Raven",
      csrfToken: "abc",
      dmEnabled: true,
      publicChatEnabled: false,
    })
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe("/api/v1/auth/email/otp/verify")
  })

  it("surfaces unauthorized verify as AuthApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(401, { error: "unauthorized" }))
    )
    await expect(
      authApi.otpVerify({ purpose: "login", email: "a@b.c", code: "000000" })
    ).rejects.toMatchObject({ status: 401, message: "unauthorized" })
  })
})

describe("authApi passkey + session", () => {
  it("register start returns challenge_id and publicKey", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        challenge_id: "ch1",
        publicKey: { publicKey: { challenge: "AA" } },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const start = await authApi.passkeyRegisterStart({ username: "Raven" })
    expect(start.challengeId).toBe("ch1")
    expect(start.publicKey).toEqual({ publicKey: { challenge: "AA" } })
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/v1/auth/passkey/register/start")
  })

  it("login finish posts credential to PROTOCOL path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        user_id: "u1",
        username: "Raven",
        csrf_token: "tok",
        dm_enabled: true,
        public_chat_enabled: true,
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await authApi.passkeyLoginFinish({
      challengeId: "ch2",
      credential: { id: "cred" },
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/v1/auth/passkey/login/finish")
    expect(JSON.parse(String(init.body))).toEqual({
      challenge_id: "ch2",
      credential: { id: "cred" },
    })
  })

  it("getSession returns null on 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { error: "unauthorized" })))
    await expect(authApi.getSession()).resolves.toBeNull()
  })

  it("logout sends X-CSRF-Token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    vi.stubGlobal("fetch", fetchMock)
    await authApi.logout("deadbeef")
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/v1/auth/logout")
    const headers = init.headers as Record<string, string>
    expect(headers["X-CSRF-Token"]).toBe("deadbeef")
  })
})
