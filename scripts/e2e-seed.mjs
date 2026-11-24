#!/usr/bin/env node
/**
 * CV-197: seed two users + opaque sessions for Playwright (no OTP).
 * Requires DATABASE_URL and `psql` on PATH. Constants mirror e2e/fixtures.ts.
 */
import { spawnSync } from "node:child_process"

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) {
  console.error("FAIL: DATABASE_URL is required")
  process.exit(1)
}

const PLAYER_A = {
  userId: "01HZXK0CV197AAA00000000001",
  username: "E2eWhite",
  email: "e2e-white@example.com",
  sessionHex:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  csrfHex: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
}

const PLAYER_B = {
  userId: "01HZXK0CV197BBB00000000001",
  username: "E2eBlack",
  email: "e2e-black@example.com",
  sessionHex:
    "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  csrfHex: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
}

const sql = `
BEGIN;
DELETE FROM sessions WHERE user_id IN ('${PLAYER_A.userId}', '${PLAYER_B.userId}');
DELETE FROM users WHERE id IN ('${PLAYER_A.userId}', '${PLAYER_B.userId}');
INSERT INTO users (
  id, username, username_lower, email, email_lower, birth_year, locale,
  dm_enabled, public_chat_enabled
) VALUES
  ('${PLAYER_A.userId}', '${PLAYER_A.username}', lower('${PLAYER_A.username}'),
   '${PLAYER_A.email}', lower('${PLAYER_A.email}'), 1990, 'en', true, true),
  ('${PLAYER_B.userId}', '${PLAYER_B.username}', lower('${PLAYER_B.username}'),
   '${PLAYER_B.email}', lower('${PLAYER_B.email}'), 1990, 'en', true, true);
INSERT INTO sessions (id, user_id, expires_at, csrf_secret)
VALUES
  (decode('${PLAYER_A.sessionHex}', 'hex'), '${PLAYER_A.userId}',
   now() + interval '30 days', decode('${PLAYER_A.csrfHex}', 'hex')),
  (decode('${PLAYER_B.sessionHex}', 'hex'), '${PLAYER_B.userId}',
   now() + interval '30 days', decode('${PLAYER_B.csrfHex}', 'hex'));
COMMIT;
`

const result = spawnSync(
  "psql",
  [databaseUrl, "-v", "ON_ERROR_STOP=1", "-c", sql],
  { encoding: "utf8" }
)
if (result.status !== 0) {
  console.error(result.stdout || "")
  console.error(result.stderr || "")
  console.error("FAIL: e2e seed")
  process.exit(result.status ?? 1)
}
console.log("OK: seeded E2eWhite + E2eBlack sessions")
