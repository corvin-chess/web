#!/usr/bin/env node
/**
 * CV-198: assert theme + sound prefs wiring and public WAV assets.
 */
import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const fail = (msg) => {
  console.error(`FAIL: ${msg}`)
  process.exitCode = 1
}
const ok = (msg) => console.log(`OK: ${msg}`)

const required = [
  "src/play/theme.ts",
  "src/play/theme.test.ts",
  "src/play/soundEvent.ts",
  "src/play/soundEvent.test.ts",
  "src/play/soundPlayer.ts",
  "src/play/soundPlayer.test.ts",
  "src/play/PrefsControls.tsx",
  "src/play/PrefsControls.test.tsx",
  "src/play/playPrefs.ts",
  "public/sounds/move.wav",
  "public/sounds/capture.wav",
  "public/sounds/check.wav",
  "public/sounds/game-end.wav",
  "public/sounds/offer.wav",
  "public/sounds/LICENSE-NOTES.md",
  "public/sounds/NOTICE.md",
]

for (const rel of required) {
  if (!existsSync(join(root, rel))) fail(`missing ${rel}`)
}
if (!process.exitCode) ok("theme/sound sources + WAV assets present")

for (const name of ["move", "capture", "check", "game-end", "offer"]) {
  const p = join(root, "public/sounds", `${name}.wav`)
  const size = statSync(p).size
  if (size < 100) fail(`${name}.wav too small (${size})`)
}
if (!process.exitCode) ok("WAV files non-empty")

const prefs = readFileSync(join(root, "src/play/playPrefs.ts"), "utf8")
for (const token of ["theme", "soundMuted", "soundEvents", "isSoundEnabled"]) {
  if (!prefs.includes(token)) fail(`playPrefs missing ${token}`)
}
if (!process.exitCode) ok("playPrefs stores theme + sound")

const main = readFileSync(join(root, "src/main.tsx"), "utf8")
if (!main.includes("applyTheme") || !main.includes("loadPlayPrefs")) {
  fail("main.tsx must apply persisted theme before render")
} else {
  ok("main applies theme before paint")
}

const playPage = readFileSync(join(root, "src/play/PlayPage.tsx"), "utf8")
for (const token of ["PrefsControls", "playSound", "soundEventFromSan", "applyTheme"]) {
  if (!playPage.includes(token)) fail(`PlayPage missing ${token}`)
}
if (!process.exitCode) ok("PlayPage wires prefs + SFX")

const playBoard = readFileSync(join(root, "src/play/PlayBoard.tsx"), "utf8")
if (!playBoard.includes("playSound") || !playBoard.includes("soundEventFromSan")) {
  fail("PlayBoard must play local move SFX")
} else {
  ok("PlayBoard plays local SFX")
}

const en = JSON.parse(
  readFileSync(join(root, "src/locales/en/play-shell.json"), "utf8")
)
const it = JSON.parse(
  readFileSync(join(root, "src/locales/it/play-shell.json"), "utf8")
)
for (const key of [
  "theme",
  "themeSystem",
  "themeLight",
  "themeDark",
  "soundMute",
  "soundMove",
  "soundCapture",
  "soundCheck",
  "soundGameEnd",
  "soundOffer",
]) {
  if (!en.prefs?.[key] || !it.prefs?.[key]) fail(`prefs.${key} missing in en/it`)
}
if (!process.exitCode) ok("en/it prefs locale keys present")

const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
if (emojiRe.test(JSON.stringify(en.prefs)) || emojiRe.test(JSON.stringify(it.prefs))) {
  fail("emoji in prefs locales")
} else {
  ok("no emoji in prefs locales")
}

const pkg = readFileSync(join(root, "package.json"), "utf8")
if (!pkg.includes("verify-theme-sound.mjs")) {
  fail("package.json verify must run verify-theme-sound.mjs")
} else {
  ok("package.json includes verify-theme-sound")
}

if (!process.exitCode) {
  console.log("verify-theme-sound: all checks passed")
}
