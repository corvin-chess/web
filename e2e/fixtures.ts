/**
 * Fixed e2e identities (CV-197). Session cookie values are hex of 32-byte ids
 * seeded into Postgres by scripts/e2e-seed.mjs — no OTP codes in CI logs.
 */

export type E2ePlayer = {
  userId: string
  username: string
  email: string
  /** Hex-encoded 32-byte session id (corvin_session cookie value). */
  sessionHex: string
  /** Hex-encoded 32-byte CSRF secret (not needed for cookie WS/auth probe). */
  csrfHex: string
}

// Crockford ULID alphabet only (no I/L/O/U).
// ULID alphabet excludes I/L/O/U (Crockford).
export const PLAYER_A: E2ePlayer = {
  userId: "01HZXK0CV197AAA00000000001",
  username: "E2eWhite",
  email: "e2e-white@example.com",
  sessionHex:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  csrfHex: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
}

export const PLAYER_B: E2ePlayer = {
  userId: "01HZXK0CV197BBB00000000001",
  username: "E2eBlack",
  email: "e2e-black@example.com",
  sessionHex:
    "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  csrfHex: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
}

export const PLAY_ORIGIN = process.env.CORVIN_E2E_ORIGIN ?? "http://127.0.0.1:5173"
