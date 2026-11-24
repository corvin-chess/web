#!/usr/bin/env node
/**
 * CV-193: assert local board play wiring (WASM pkg, pieces, PlayPage).
 */
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const fail = (msg) => {
  console.error(`FAIL: ${msg}`)
  process.exitCode = 1
}
const ok = (msg) => console.log(`OK: ${msg}`)

const shapeOnly = process.argv.includes("--shape-only")

const pkgDir = join(root, "src", "chess", "pkg")
const requiredPkg = [
  "corvin_play_wasm.js",
  "corvin_play_wasm.d.ts",
  "corvin_play_wasm_bg.wasm",
  "package.json",
]
for (const f of requiredPkg) {
  if (!existsSync(join(pkgDir, f))) fail(`missing wasm pkg file: ${f}`)
}
if (!process.exitCode) ok("wasm pkg files present")

const pkgGitignore = join(pkgDir, ".gitignore")
if (existsSync(pkgGitignore)) {
  fail("src/chess/pkg/.gitignore must not exist (pkg is committed)")
} else {
  ok("no pkg/.gitignore")
}

const dTs = readFileSync(join(pkgDir, "corvin_play_wasm.d.ts"), "utf8")
if (!dTs.includes("legalMoves") || !dTs.includes("applyMove")) {
  fail("pkg typings must export legalMoves and applyMove")
} else {
  ok("pkg typings export legalMoves + applyMove")
}

const piecesDir = join(root, "public", "pieces", "corvid")
const expectedPieces = [
  "w-king",
  "w-queen",
  "w-rook",
  "w-bishop",
  "w-knight",
  "w-pawn",
  "b-king",
  "b-queen",
  "b-rook",
  "b-bishop",
  "b-knight",
  "b-pawn",
]
for (const name of expectedPieces) {
  if (!existsSync(join(piecesDir, `${name}.svg`))) {
    fail(`missing Corvid piece: ${name}.svg`)
  }
}
if (!process.exitCode) ok("12 Corvid SVGs in public/pieces/corvid")

const playPage = readFileSync(join(root, "src", "play", "PlayPage.tsx"), "utf8")
if (!playPage.includes("LocalBoard") || !playPage.includes("loadWasmRules")) {
  fail("PlayPage must mount LocalBoard via loadWasmRules")
} else {
  ok("PlayPage wires LocalBoard + WASM")
}

const enPlay = join(root, "src", "locales", "en", "play.json")
const itPlay = join(root, "src", "locales", "it", "play.json")
if (!existsSync(enPlay) || !existsSync(itPlay)) {
  fail("missing en/it play.json locales")
} else {
  const en = JSON.parse(readFileSync(enPlay, "utf8"))
  const it = JSON.parse(readFileSync(itPlay, "utf8"))
  const enKeys = Object.keys(en).sort().join(",")
  const itKeys = Object.keys(it).sort().join(",")
  if (enKeys !== itKeys) fail("en/it play.json key mismatch")
  else ok("en/it play.json locale parity")
}

const playBoardPath = join(root, "src", "play", "PlayBoard.tsx")
const localBoard = readFileSync(join(root, "src", "play", "LocalBoard.tsx"), "utf8")
if (existsSync(playBoardPath)) {
  const playBoard = readFileSync(playBoardPath, "utf8")
  if (!playBoard.includes("mountBoard") || !playBoard.includes("createLocalPlayController")) {
    fail("PlayBoard must use mountBoard + local play controller")
  } else {
    ok("PlayBoard uses design-system mountBoard")
  }
  if (!localBoard.includes("PlayBoard")) {
    fail("LocalBoard must wrap PlayBoard")
  } else {
    ok("LocalBoard wraps PlayBoard")
  }
} else if (!localBoard.includes("mountBoard") || !localBoard.includes("createLocalPlayController")) {
  fail("LocalBoard must use mountBoard + local play controller")
} else {
  ok("LocalBoard uses design-system mountBoard")
}

const crateToml = join(root, "crates", "corvin-play-wasm", "Cargo.toml")
if (!existsSync(crateToml)) {
  fail("missing crates/corvin-play-wasm/Cargo.toml")
} else {
  const toml = readFileSync(crateToml, "utf8")
  if (!toml.includes("corvin-chess-core") || !toml.includes("f20f50217cd173a35b197876471af9802dbb6403")) {
    fail("play-wasm must pin chess-core rev f20f502…")
  } else {
    ok("play-wasm pins chess-core git rev")
  }
}

if (shapeOnly) {
  if (!process.exitCode) console.log("All CV-193 board-play shape checks passed.")
  process.exit(process.exitCode ?? 0)
}

// Node smoke: instantiate WASM and call legalMoves (20 at startpos).
const START =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
try {
  const wasmPath = join(pkgDir, "corvin_play_wasm_bg.wasm")
  const jsPath = join(pkgDir, "corvin_play_wasm.js")
  const mod = await import(pathToFileURL(jsPath).href)
  const bytes = readFileSync(wasmPath)
  await mod.default({ module_or_path: bytes })
  const moves = mod.legalMoves(START)
  if (!Array.isArray(moves) && !(moves instanceof Array)) {
    // wasm-bindgen may return a vector-like object
  }
  const list = Array.from(moves)
  if (list.length !== 20) {
    fail(`startpos legalMoves expected 20, got ${list.length}`)
  } else {
    ok("WASM legalMoves(startpos) === 20")
  }
  const after = mod.applyMove(START, "e2e4")
  if (typeof after !== "string" || !after.includes("4P3")) {
    fail(`applyMove e2e4 unexpected FEN: ${after}`)
  } else {
    ok("WASM applyMove(e2e4) returns expected FEN fragment")
  }
  try {
    mod.applyMove(START, "e2e5")
    fail("illegal applyMove e2e5 should throw")
  } catch {
    ok("illegal applyMove throws")
  }
} catch (err) {
  fail(`WASM node smoke failed: ${err}`)
}

if (!process.exitCode) {
  console.log("All CV-193 board-play checks passed.")
}
