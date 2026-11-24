#!/usr/bin/env node
/**
 * CV-197: shape checks for Playwright two-browser e2e (always-on; no stack).
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
  "playwright.config.ts",
  "e2e/two-browser.spec.ts",
  "e2e/helpers.ts",
  "e2e/fixtures.ts",
  "scripts/e2e-seed.mjs",
]
for (const rel of required) {
  if (!existsSync(join(root, rel))) fail(`missing ${rel}`)
  else ok(`present ${rel}`)
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
if (!pkg.devDependencies?.["@playwright/test"]) {
  fail("package.json missing @playwright/test")
} else {
  ok("@playwright/test listed")
}
if (!pkg.scripts?.["test:e2e"]) {
  fail("package.json missing test:e2e script")
} else {
  ok("test:e2e script present")
}

const spec = readFileSync(join(root, "e2e/two-browser.spec.ts"), "utf8")
for (const needle of [
  "rated blitz",
  "casual blitz",
  "Quick pair",
  "Resign",
  "Rating",
  "CORVIN_E2E",
  'playUci(pageA, "e2", "e4", "e4")',
  "resetStack",
]) {
  if (!spec.includes(needle)) fail(`spec missing: ${needle}`)
}
if (!process.exitCode) ok("two-browser.spec covers rated+casual")

const fixtures = readFileSync(join(root, "e2e/fixtures.ts"), "utf8")
if (!fixtures.includes("01HZXK0CV197AAA00000000001")) {
  fail("fixtures missing player A ULID")
} else {
  ok("fixtures ULID present")
}

const seed = readFileSync(join(root, "scripts/e2e-seed.mjs"), "utf8")
if (!seed.includes("E2eWhite") || !seed.includes("decode(")) {
  fail("e2e-seed must insert users and decode session hex")
} else {
  ok("e2e-seed inserts sessions")
}

const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8")
if (!/CORVIN_E2E|test:e2e|playwright/i.test(ci)) {
  fail("ci.yml must invoke Playwright e2e")
} else {
  ok("ci.yml references Playwright e2e")
}
if (!ci.includes("postgresql-client")) {
  fail("ci.yml must install postgresql-client for e2e-seed")
} else {
  ok("ci.yml installs postgresql-client")
}
if (!ci.includes("redis-tools")) {
  fail("ci.yml must install redis-tools for FLUSHDB between tests")
} else {
  ok("ci.yml installs redis-tools")
}

const pw = readFileSync(join(root, "playwright.config.ts"), "utf8")
if (!pw.includes("CI requires CORVIN_E2E=1")) {
  fail("playwright.config must fail CI when CORVIN_E2E unset")
} else {
  ok("playwright.config guards CORVIN_E2E in CI")
}

const seedSrc = readFileSync(join(root, "scripts/e2e-seed.mjs"), "utf8")
if (!seedSrc.includes("CORVIN_E2E_SEED") || !seedSrc.includes("refuse seed")) {
  fail("e2e-seed must refuse non-test environments")
} else {
  ok("e2e-seed env guard present")
}

if (!process.exitCode) {
  console.log("verify-e2e: all shape checks passed")
}
