#!/usr/bin/env node
/**
 * CV-194 / CV-195: assert quick-pair play UI + premove/confirm wiring.
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

const required = [
  "src/play/PlayPage.tsx",
  "src/play/LobbyPanel.tsx",
  "src/play/GameChrome.tsx",
  "src/play/PlayBoard.tsx",
  "src/play/onlineSession.ts",
  "src/play/clockDisplay.ts",
  "src/play/useOnlinePlay.ts",
  "src/play/premove.ts",
  "src/play/premoveGeometry.ts",
  "src/play/playPrefs.ts",
  "src/play/onlineSession.test.ts",
  "src/play/clockDisplay.test.ts",
  "src/play/premove.test.ts",
  "src/play/premoveGeometry.test.ts",
  "src/play/playPrefs.test.ts",
  "src/play/premoveSubmit.test.ts",
  "src/locales/en/play-shell.json",
  "src/locales/it/play-shell.json",
]

for (const rel of required) {
  if (!existsSync(join(root, rel))) fail(`missing ${rel}`)
}
if (!process.exitCode) ok("play UI source + tests present")

const playPage = readFileSync(join(root, "src/play/PlayPage.tsx"), "utf8")
for (const token of ["LobbyPanel", "GameChrome", "useOnlinePlay", "PlayBoard"]) {
  if (!playPage.includes(token)) fail(`PlayPage missing ${token}`)
}
if (!process.exitCode) ok("PlayPage wires lobby + online chrome")

const onlineHook = readFileSync(join(root, "src/play/useOnlinePlay.ts"), "utf8")
if (!onlineHook.includes("QuickPair") || !onlineHook.includes("OfferDraw")) {
  fail("useOnlinePlay must send QuickPair and OfferDraw")
} else {
  ok("useOnlinePlay sends QuickPair + offers")
}
if (!onlineHook.includes("premoved")) {
  fail("useOnlinePlay must send Move.premoved for premoves")
} else {
  ok("useOnlinePlay sends Move.premoved")
}

const playBoard = readFileSync(join(root, "src/play/PlayBoard.tsx"), "utf8")
for (const token of ["allowPremove", "confirmMoves", "geometricPremoveDests"]) {
  if (!playBoard.includes(token)) fail(`PlayBoard missing ${token}`)
}
if (!process.exitCode) ok("PlayBoard premove + confirm wiring present")

if (!playPage.includes("resolvePendingPremove") || !playPage.includes("premoved")) {
  fail("PlayPage must resolve and fire premoved moves")
} else {
  ok("PlayPage auto-fires legal premoves")
}

const client = readFileSync(join(root, "src/ws/client.ts"), "utf8")
for (const typ of ["GameStart", "ClockSync", "MoveRejected", "GameEnd", "send("]) {
  if (!client.includes(typ)) fail(`WsClient missing ${typ}`)
}
if (!process.exitCode) ok("WsClient play message handlers present")

const en = JSON.parse(
  readFileSync(join(root, "src/locales/en/play-shell.json"), "utf8")
)
const it = JSON.parse(
  readFileSync(join(root, "src/locales/it/play-shell.json"), "utf8")
)

const keyWalk = (obj, prefix = "") => {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object") keys.push(...keyWalk(v, path))
    else keys.push(path)
  }
  return keys
}

const enKeys = keyWalk(en).sort()
const itKeys = keyWalk(it).sort()
if (enKeys.join(",") !== itKeys.join(",")) {
  fail("en/it play-shell key trees differ")
} else {
  ok(`play-shell en/it parity (${enKeys.length} keys)`)
}

for (const need of [
  "lobby.quickPair",
  "lobby.waiting",
  "game.resign",
  "game.clock",
  "game.premoveSet",
  "game.confirmMovesToggle",
  "offers.drawOffer",
  "offers.accept",
]) {
  if (!enKeys.includes(need)) fail(`missing required key ${need}`)
}
if (!process.exitCode) ok("required lobby/game/offers/premove keys present")

const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
const blobs = [
  playPage,
  readFileSync(join(root, "src/play/LobbyPanel.tsx"), "utf8"),
  readFileSync(join(root, "src/play/GameChrome.tsx"), "utf8"),
  JSON.stringify(en),
  JSON.stringify(it),
]
for (const body of blobs) {
  if (emojiRe.test(body)) fail("emoji found in play UI sources")
}
if (!process.exitCode) ok("no emoji in play UI sources")

const pkg = readFileSync(join(root, "package.json"), "utf8")
if (!pkg.includes("verify-play-ui.mjs")) {
  fail("package.json verify must run verify-play-ui.mjs")
} else {
  ok("package.json includes verify-play-ui")
}

if (!process.exitCode) {
  console.log("verify-play-ui: all checks passed")
}
