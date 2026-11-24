#!/usr/bin/env node
/**
 * CV-192: assert WS client module + PROTOCOL shapes + Vite /ws proxy.
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
  "src/ws/client.ts",
  "src/ws/seq.ts",
  "src/ws/url.ts",
  "src/ws/types.ts",
  "src/ws/index.ts",
  "src/ws/client.test.ts",
  "src/ws/seq.test.ts",
]

for (const rel of requiredFiles) {
  if (!existsSync(join(repoRoot, rel))) fail(`missing ${rel}`)
}
if (!process.exitCode) ok("ws source + test files present")

const client = read("src/ws/client.ts")
if (client) {
  for (const typ of ["Hello", "Welcome", "Ping", "Pong", "ResumeGame", "GameSnapshot", "Replay", "GAME_GONE"]) {
    if (!client.includes(typ)) fail(`client missing PROTOCOL token ${typ}`)
  }
  if (!/last_seq/.test(client)) fail("client must send last_seq on ResumeGame")
  if (!/player_token/.test(client)) fail("client must send player_token on ResumeGame")
  if (!process.exitCode) ok("PROTOCOL handshake + resume tokens present")
}

const seq = read("src/ws/seq.ts")
if (seq) {
  if (!/maxBuffer/.test(seq) && !/50/.test(seq)) {
    fail("seq tracker must bound out-of-order buffer (PROTOCOL ≤50)")
  }
  if (!/duplicate/.test(seq)) fail("seq tracker must ignore duplicates")
  if (!process.exitCode) ok("seq ordering helpers present")
}

const vite = read("vite.config.ts")
if (vite) {
  if (!/"\/ws"/.test(vite) && !/'\/ws'/.test(vite)) {
    fail("vite.config.ts must proxy /ws")
  }
  if (!/ws:\s*true/.test(vite)) fail("vite /ws proxy must set ws: true")
  if (!process.exitCode) ok("Vite /ws proxy configured")
}

const pkg = read("package.json")
if (pkg) {
  if (!/verify-ws\.mjs/.test(pkg)) fail("package.json verify script must run verify-ws.mjs")
  if (!process.exitCode) ok("verify script includes verify-ws")
}

const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
for (const rel of requiredFiles.filter((r) => r.endsWith(".ts"))) {
  const body = read(rel)
  if (body && emojiRe.test(body)) fail(`emoji in ${rel}`)
}
if (!process.exitCode) ok("no emoji in ws sources")

if (!process.exitCode) {
  console.log("All CV-192 web WS checks passed.")
}
