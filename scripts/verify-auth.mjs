#!/usr/bin/env node
/**
 * CV-191: assert Auth UI + PROTOCOL auth paths + en/it locale parity.
 */
import { readFileSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

const fail = (msg) => {
  console.error(`FAIL: ${msg}`)
  process.exitCode = 1
}

const ok = (msg) => console.log(`OK: ${msg}`)

const read = (rel) => {
  const p = join(repoRoot, rel)
  if (!existsSync(p)) {
    fail(`missing ${rel}`)
    return null
  }
  return readFileSync(p, "utf8")
}

const requiredFiles = [
  "src/auth/api.ts",
  "src/auth/webauthn.ts",
  "src/auth/AuthPage.tsx",
  "src/auth/AuthProvider.tsx",
  "src/auth/api.test.ts",
  "src/auth/AuthPage.test.tsx",
  "src/locales/en/auth.json",
  "src/locales/it/auth.json",
]

for (const rel of requiredFiles) {
  if (!existsSync(join(repoRoot, rel))) fail(`missing ${rel}`)
}
if (!process.exitCode) ok("auth source + test + locale files present")

const api = read("src/auth/api.ts")
if (api) {
  const paths = [
    "/api/v1/auth/email/otp/start",
    "/api/v1/auth/email/otp/verify",
    "/api/v1/auth/passkey/register/start",
    "/api/v1/auth/passkey/register/finish",
    "/api/v1/auth/passkey/login/start",
    "/api/v1/auth/passkey/login/finish",
    "/api/v1/auth/session",
    "/api/v1/auth/logout",
  ]
  for (const path of paths) {
    if (!api.includes(`"${path}"`) && !api.includes(`'${path}'`)) {
      fail(`auth api missing PROTOCOL path ${path}`)
    }
  }
  if (!/credentials:\s*["']include["']/.test(api)) {
    fail("auth api must use credentials: include for session cookies")
  }
  if (!/X-CSRF-Token/.test(api)) {
    fail("auth api must send X-CSRF-Token on logout")
  }
  if (!process.exitCode) ok("PROTOCOL auth paths + cookie/CSRF wiring")
}

const app = read("src/App.tsx")
if (app) {
  if (!/path=["']\/login["']/.test(app)) fail('App.tsx must declare path="/login"')
  if (!/AuthPage/.test(app)) fail("App.tsx must render AuthPage")
  if (!/AuthProvider/.test(app)) fail("App.tsx must wrap with AuthProvider")
  if (!process.exitCode) ok("App wires /login + AuthProvider")
}

const play = read("src/play/PlayPage.tsx")
if (play) {
  if (/passkey|OTP|otpStart|otpVerify/i.test(play)) {
    fail("PlayPage must not embed auth forms (passkey/OTP belong on /login)")
  }
  if (!/to=["']\/login["']/.test(play)) {
    fail('PlayPage should link to /login for sign-in')
  }
  if (!process.exitCode) ok("PlayPage keeps auth forms off the play shell")
}

const vite = read("vite.config.ts")
if (vite) {
  if (!/proxy/.test(vite) || !/["']\/api["']/.test(vite)) {
    fail("vite.config.ts must proxy /api to the server")
  } else {
    ok("Vite /api proxy configured")
  }
}

const enRaw = read("src/locales/en/auth.json")
const itRaw = read("src/locales/it/auth.json")
if (enRaw && itRaw) {
  let en
  let it
  try {
    en = JSON.parse(enRaw)
    it = JSON.parse(itRaw)
  } catch {
    fail("auth locale JSON failed to parse")
    en = null
  }
  if (en && it) {
    const flatten = (obj, prefix = "") => {
      const out = []
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === "object" && !Array.isArray(v)) {
          out.push(...flatten(v, key))
        } else {
          out.push([key, v])
        }
      }
      return out
    }
    const enKeys = flatten(en).map(([k]) => k).sort()
    const itKeys = flatten(it).map(([k]) => k).sort()
    if (enKeys.join(",") !== itKeys.join(",")) {
      fail("en/it auth locale key trees differ")
    }
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    for (const [locale, pairs] of [
      ["en", flatten(en)],
      ["it", flatten(it)],
    ]) {
      for (const [key, value] of pairs) {
        if (typeof value !== "string" || value.trim().length === 0) {
          fail(`${locale} auth.${key} must be a non-empty string`)
        }
        if (emojiRe.test(String(value))) {
          fail(`${locale} auth.${key} contains emoji`)
        }
      }
    }
    const required = [
      "title",
      "methodPasskey",
      "methodEmail",
      "methodGroup",
      "signInLink",
      "documentTitle",
      "sendCode",
      "verifyCode",
      "continuePasskey",
      "logout",
    ]
    for (const key of required) {
      if (!(key in en)) fail(`en auth missing key ${key}`)
    }
    if (!process.exitCode) ok("en/it auth locale parity")
  }
}

if (!process.exitCode) {
  console.log("All CV-191 auth checks passed.")
}
