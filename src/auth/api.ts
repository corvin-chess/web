import type { AuthApiError, AuthSession, ChallengeStart } from "./types"

const jsonHeaders = { "Content-Type": "application/json", Accept: "application/json" }

const parseSession = (body: Record<string, unknown>): AuthSession => {
  const userId = body.user_id
  const username = body.username
  const csrfToken = body.csrf_token
  if (
    typeof userId !== "string" ||
    typeof username !== "string" ||
    typeof csrfToken !== "string"
  ) {
    throw new Error("invalid auth session body")
  }
  return {
    userId,
    username,
    csrfToken,
    dmEnabled: Boolean(body.dm_enabled),
    publicChatEnabled: Boolean(body.public_chat_enabled),
  }
}

const parseChallenge = (body: Record<string, unknown>): ChallengeStart => {
  const challengeId = body.challenge_id
  const publicKey = body.publicKey
  if (typeof challengeId !== "string" || !publicKey || typeof publicKey !== "object") {
    throw new Error("invalid challenge start body")
  }
  return { challengeId, publicKey: publicKey as Record<string, unknown> }
}

const readError = async (res: Response): Promise<AuthApiError> => {
  let message = "request failed"
  try {
    const body = (await res.json()) as { error?: string }
    if (typeof body.error === "string" && body.error.length > 0) {
      message = body.error
    }
  } catch {
    // keep default
  }
  return { status: res.status, message }
}

const postJson = async (
  path: string,
  body: unknown,
  init?: { csrfToken?: string }
): Promise<Response> => {
  const headers: Record<string, string> = { ...jsonHeaders }
  if (init?.csrfToken) {
    headers["X-CSRF-Token"] = init.csrfToken
  }
  return fetch(path, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  })
}

export const authApi = {
  async otpStart(input: {
    purpose: "login" | "register"
    email: string
    username?: string
    birthYear?: number
    locale?: string
  }): Promise<void> {
    const res = await postJson("/api/v1/auth/email/otp/start", {
      purpose: input.purpose,
      email: input.email,
      username: input.username,
      birth_year: input.birthYear,
      locale: input.locale,
    })
    if (!res.ok) throw await readError(res)
  },

  async otpVerify(input: {
    purpose: "login" | "register"
    email: string
    code: string
  }): Promise<AuthSession> {
    const res = await postJson("/api/v1/auth/email/otp/verify", {
      purpose: input.purpose,
      email: input.email,
      code: input.code,
    })
    if (!res.ok) throw await readError(res)
    return parseSession((await res.json()) as Record<string, unknown>)
  },

  async passkeyRegisterStart(input: {
    username: string
    email?: string
    birthYear?: number
    locale?: string
  }): Promise<ChallengeStart> {
    const res = await postJson("/api/v1/auth/passkey/register/start", {
      username: input.username,
      email: input.email,
      birth_year: input.birthYear,
      locale: input.locale,
    })
    if (!res.ok) throw await readError(res)
    return parseChallenge((await res.json()) as Record<string, unknown>)
  },

  async passkeyRegisterFinish(input: {
    challengeId: string
    credential: unknown
  }): Promise<AuthSession> {
    const res = await postJson("/api/v1/auth/passkey/register/finish", {
      challenge_id: input.challengeId,
      credential: input.credential,
    })
    if (!res.ok) throw await readError(res)
    return parseSession((await res.json()) as Record<string, unknown>)
  },

  async passkeyLoginStart(input: { username: string }): Promise<ChallengeStart> {
    const res = await postJson("/api/v1/auth/passkey/login/start", {
      username: input.username,
    })
    if (!res.ok) throw await readError(res)
    return parseChallenge((await res.json()) as Record<string, unknown>)
  },

  async passkeyLoginFinish(input: {
    challengeId: string
    credential: unknown
  }): Promise<AuthSession> {
    const res = await postJson("/api/v1/auth/passkey/login/finish", {
      challenge_id: input.challengeId,
      credential: input.credential,
    })
    if (!res.ok) throw await readError(res)
    return parseSession((await res.json()) as Record<string, unknown>)
  },

  async getSession(): Promise<AuthSession | null> {
    const res = await fetch("/api/v1/auth/session", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
    if (res.status === 401) return null
    if (!res.ok) throw await readError(res)
    return parseSession((await res.json()) as Record<string, unknown>)
  },

  async logout(csrfToken: string): Promise<void> {
    const res = await postJson("/api/v1/auth/logout", {}, { csrfToken })
    if (!res.ok) throw await readError(res)
  },
}
