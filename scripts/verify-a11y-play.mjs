#!/usr/bin/env node
/**
 * CV-196 a11y checklist: keyboard play + persistent aria-live SAN.
 */
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const fail = (msg) => {
  console.error(`FAIL: ${msg}`)
  process.exitCode = 1
}
const ok = (msg) => console.log(`OK: ${msg}`)

const read = (rel) => readFileSync(join(root, rel), "utf8")

const required = [
  "src/play/PlayBoard.tsx",
  "src/play/GameChrome.tsx",
  "src/play/announceSan.ts",
  "src/play/announceSan.test.ts",
  "src/play/LocalBoard.test.tsx",
  "src/play/GameChrome.test.tsx",
  "src/locales/en/play-shell.json",
  "src/locales/it/play-shell.json",
  "src/locales/en/play.json",
  "src/locales/it/play.json",
]
for (const rel of required) {
  if (!existsSync(join(root, rel))) fail(`missing ${rel}`)
}
if (!process.exitCode) ok("a11y source + tests present")

const playBoard = read("src/play/PlayBoard.tsx")
if (!playBoard.includes('key !== "Escape"') && !playBoard.includes("Escape")) {
  fail("PlayBoard must handle Escape to clear selection")
} else {
  ok("PlayBoard Escape clear selection")
}
if (!playBoard.includes("sanForUci") || !playBoard.includes("formatMoveAnnouncement")) {
  fail("PlayBoard must announce local moves via SAN helpers")
} else {
  ok("PlayBoard local SAN announcement wiring")
}
if (!playBoard.includes('aria-live={onSubmitMove ? "off" : "polite"}')) {
  fail("online PlayBoard status must set aria-live off (SAN is GameChrome-only)")
} else {
  ok("online board status aria-live off")
}

const gameChrome = read("src/play/GameChrome.tsx")
if (
  !gameChrome.includes('aria-live="polite"') ||
  !gameChrome.includes("aria-atomic") ||
  !gameChrome.includes("moveAnnounced")
) {
  fail("GameChrome must keep persistent polite aria-live SAN region")
} else {
  ok("GameChrome persistent aria-live SAN")
}
if (gameChrome.includes("session.lastSan ?")) {
  fail("GameChrome SAN live region must stay mounted when lastSan is null")
} else {
  ok("GameChrome live region always mounted")
}

const dTs = read("src/chess/pkg/corvin_play_wasm.d.ts")
if (!dTs.includes("toSan")) {
  fail("wasm pkg typings must export toSan")
} else {
  ok("wasm toSan export present")
}

const rust = read("crates/corvin-play-wasm/src/lib.rs")
if (!rust.includes("js_name = toSan") || !rust.includes("to_san")) {
  fail("corvin-play-wasm must export toSan")
} else {
  ok("corvin-play-wasm toSan binding")
}

const localTest = read("src/play/LocalBoard.test.tsx")
for (const token of ["ArrowUp", "Enter", "Escape", "Played e4"]) {
  if (!localTest.includes(token)) fail(`LocalBoard.test missing ${token}`)
}
if (!process.exitCode) ok("LocalBoard keyboard + SAN tests")

const enShell = JSON.parse(read("src/locales/en/play-shell.json"))
const itShell = JSON.parse(read("src/locales/it/play-shell.json"))
if (!enShell.game?.moveAnnounced || !itShell.game?.moveAnnounced) {
  fail("en/it play-shell must define game.moveAnnounced")
} else {
  ok("en/it moveAnnounced present")
}

const enPlay = JSON.parse(read("src/locales/en/play.json"))
const itPlay = JSON.parse(read("src/locales/it/play.json"))
if (!String(enPlay.played).includes("{san}") || !String(itPlay.played).includes("{san}")) {
  fail("en/it play.played must interpolate {san}")
} else {
  ok("play.played uses {san}")
}

const styles = read("src/styles.css")
if (!styles.includes(":focus-visible") || !styles.includes("--focus-ring")) {
  fail("styles must define focus-visible mist ring")
} else {
  ok("focus-visible styles present")
}

const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
for (const rel of [
  "src/play/PlayBoard.tsx",
  "src/play/GameChrome.tsx",
  "src/play/announceSan.ts",
  "src/locales/en/play.json",
  "src/locales/it/play.json",
]) {
  if (emojiRe.test(read(rel))) fail(`emoji in ${rel}`)
}
if (!process.exitCode) ok("no emoji in a11y sources")

const pkg = read("package.json")
if (!pkg.includes("verify-a11y-play.mjs")) {
  fail("package.json verify must run verify-a11y-play.mjs")
} else {
  ok("package.json includes verify-a11y-play")
}

if (!process.exitCode) {
  console.log("verify-a11y-play: all checks passed")
}
