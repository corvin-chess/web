/** Shared auth session shape from PROTOCOL / server AuthSuccess. */
export type AuthSession = {
  userId: string
  username: string
  csrfToken: string
  dmEnabled: boolean
  publicChatEnabled: boolean
}

export type AuthMode = "login" | "register"
export type AuthMethod = "passkey" | "email"

export type ChallengeStart = {
  challengeId: string
  /** CreationChallengeResponse or RequestChallengeResponse from webauthn-rs. */
  publicKey: Record<string, unknown>
}

export type AuthApiError = {
  status: number
  message: string
}
