#!/usr/bin/env node
/**
 * CV-190: assert Vite/React scaffold + design-system wiring + blank /play route.
 */
import { readFileSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const shapeOnly = process.argv.includes("--shape-only")

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
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "index.html",
  "src/main.tsx",
  "src/App.tsx",
  "src/play/PlayPage.tsx",
  "src/styles.css",
  "src/vite-env.d.ts",
  ".gitignore",
]

for (const rel of requiredFiles) {
  if (!existsSync(join(repoRoot, rel))) {
    fail(`missing ${rel}`)
  }
}
if (!process.exitCode) ok("required scaffold files present")

const pkgRaw = read("package.json")
if (pkgRaw) {
  let pkg
  try {
    pkg = JSON.parse(pkgRaw)
  } catch {
    fail("package.json is not valid JSON")
    pkg = null
  }
  if (pkg) {
    if (pkg.type !== "module") fail('package.json type must be "module"')
    if (pkg.name !== "@corvin-chess/web") fail('package.json name must be "@corvin-chess/web"')
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    for (const name of [
      "react",
      "react-dom",
      "react-router-dom",
      "vite",
      "typescript",
      "@vitejs/plugin-react",
      "vitest",
      "@testing-library/react",
      "@testing-library/jest-dom",
      "jsdom",
      "@corvin-chess/design-system",
    ]) {
      if (!deps[name]) fail(`package.json missing dependency: ${name}`)
    }
    const ds = pkg.dependencies?.["@corvin-chess/design-system"]
    if (
      ds &&
      !/git\+https:\/\/github\.com\/corvin-chess\/design-system\.git#69d7c6ce4079891cfc82925218e18db09ee42463/.test(
        ds
      ) &&
      !ds.startsWith("file:")
    ) {
      fail(
        "@corvin-chess/design-system must be git+https://github.com/corvin-chess/design-system.git#69d7c6ce… (CV-114) or file:"
      )
    }
    for (const script of ["dev", "build", "preview", "test", "verify"]) {
      if (!pkg.scripts?.[script]) fail(`package.json missing script: ${script}`)
    }
    if (!process.exitCode) ok("package.json scripts and deps")
  }
}

const app = read("src/App.tsx")
if (app) {
  if (!/path=["']\/play["']/.test(app)) fail('App.tsx must declare path="/play"')
  if (!/PlayPage/.test(app)) fail("App.tsx must render PlayPage")
  if (!/react-router-dom/.test(app)) fail("App.tsx must use react-router-dom")
  // /login Auth UI is CV-191; scaffold only requires /play remain wired.
  if (!process.exitCode) ok("App.tsx wires /play")
}

const play = read("src/play/PlayPage.tsx")
if (play) {
  if (!/export\s+(const|function)\s+PlayPage/.test(play)) {
    fail("PlayPage.tsx must export PlayPage")
  }
  if (!/role=["']main["']|<(main)\b/.test(play)) {
    fail("PlayPage must expose a main landmark")
  }
  if (!/aria-label=["']Play["']/.test(play)) {
    fail('PlayPage main must have aria-label="Play"')
  }
  // Blank: no board mount, no WS, no auth forms in this task
  if (/mountBoard|WebSocket|passkey|OTP/i.test(play)) {
    fail("PlayPage must stay blank (no board/WS/auth yet)")
  }
  if (!process.exitCode) ok("PlayPage blank accessible shell")
}

const styles = read("src/styles.css")
if (styles) {
  if (!/@corvin-chess\/design-system\/tokens\.css/.test(styles)) {
    fail("src/styles.css must import @corvin-chess/design-system/tokens.css")
  }
  if (!/var\(--ground\)/.test(styles) || !/var\(--body\)/.test(styles)) {
    fail("src/styles.css must use --ground and --body token variables")
  }
  if (!process.exitCode) ok("styles.css imports design-system tokens")
}

const main = read("src/main.tsx")
if (main) {
  if (!/\.\/styles\.css/.test(main)) fail("main.tsx must import ./styles.css")
  if (!/\.\/App/.test(main)) fail("main.tsx must import App")
  if (!process.exitCode) ok("main.tsx entry wiring")
}

const indexHtml = read("index.html")
if (indexHtml) {
  if (!/id=["']root["']/.test(indexHtml)) fail('index.html missing #root')
  if (!/src\/main\.tsx/.test(indexHtml)) fail("index.html must load /src/main.tsx")
  if (!process.exitCode) ok("index.html entry")
}

const viteCfg = read("vite.config.ts")
if (viteCfg) {
  if (!/@vitejs\/plugin-react/.test(viteCfg)) fail("vite.config.ts must use @vitejs/plugin-react")
  if (!/vitest|test\s*:/.test(viteCfg)) fail("vite.config.ts must configure vitest")
  if (!process.exitCode) ok("vite.config.ts react + vitest")
}

const testFile = join(repoRoot, "src/play/PlayPage.test.tsx")
if (!existsSync(testFile)) {
  fail("missing src/play/PlayPage.test.tsx")
} else {
  const t = readFileSync(testFile, "utf8")
  if (!/PlayPage/.test(t)) fail("PlayPage.test.tsx must exercise PlayPage")
  if (!/getByRole\(["']main["']/.test(t)) {
    fail("PlayPage.test.tsx must assert main landmark")
  }
  ok("PlayPage.test.tsx present")
}

// Shape-only by default when --shape-only (CI/local verify runs test+build separately).
if (shapeOnly) {
  if (!existsSync(join(repoRoot, "dist/index.html"))) {
    fail("dist/index.html missing; run npm run build before shape-only verify")
  } else {
    ok("dist/index.html present")
  }
} else if (!existsSync(join(repoRoot, "node_modules"))) {
  console.log("SKIP: node_modules missing; file-shape checks only")
} else {
  // Callers should prefer `npm run verify` which runs test/build then --shape-only.
  if (!existsSync(join(repoRoot, "dist/index.html"))) {
    fail("dist/index.html missing; run npm run build first")
  } else {
    ok("dist/index.html present")
  }
}

if (!process.exitCode) {
  console.log("All CV-190 scaffold checks passed.")
}
