#!/usr/bin/env node
/**
 * CV-199: assert web Dockerfile + nginx proxy conf exist and stay deploy-safe.
 * Structural checks only; image build runs in infra Compose CI.
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

const dockerfilePath = join(repoRoot, "Dockerfile")
const nginxPath = join(repoRoot, "docker", "nginx.conf")

if (!existsSync(dockerfilePath)) {
  fail("missing Dockerfile")
  process.exit(1)
}

const dockerfile = readFileSync(dockerfilePath, "utf8")

if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(dockerfile)) {
  fail("emoji found in Dockerfile")
} else {
  ok("Dockerfile has no emoji")
}

if (!/FROM\s+node:/i.test(dockerfile)) {
  fail("Dockerfile must use an official node build image")
} else {
  ok("node build stage present")
}

if (!/npm (ci|run build)/i.test(dockerfile)) {
  fail("Dockerfile must npm ci / npm run build")
} else {
  ok("npm build present")
}

if (!/nginx/i.test(dockerfile)) {
  fail("Dockerfile must ship a static nginx runtime")
} else {
  ok("nginx runtime present")
}

if (/Stockfish|Leela|lc0|lichess|chess\.com/i.test(dockerfile)) {
  fail("Dockerfile must not name third-party chess products")
} else {
  ok("no third-party chess product names")
}

if (/BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY|ghp_[A-Za-z0-9]{36,}/i.test(dockerfile)) {
  fail("Dockerfile looks like it embeds a secret")
} else {
  ok("no embedded secret smell")
}

if (!existsSync(nginxPath)) {
  fail("missing docker/nginx.conf")
} else {
  const nginx = readFileSync(nginxPath, "utf8")
  if (!/location\s+\/api/i.test(nginx)) {
    fail("nginx must proxy /api to the server")
  }
  if (!/location\s+\/ws/i.test(nginx)) {
    fail("nginx must proxy /ws to the server")
  }
  if (!/proxy_set_header\s+Upgrade/i.test(nginx)) {
    fail("nginx /ws must forward Upgrade for WebSockets")
  }
  if (!/try_files/i.test(nginx)) {
    fail("nginx must SPA-fallback with try_files")
  }
  if (!/server:3000/i.test(nginx)) {
    fail("nginx must target server:3000")
  }
  if (!/proxy_buffering\s+off/i.test(nginx)) {
    fail("nginx /ws must disable proxy_buffering")
  }
  if (!/resolver\s+127\.0\.0\.11/i.test(nginx)) {
    fail("nginx must use Docker DNS resolver for upstream re-resolve")
  }
  if (!process.exitCode) ok("nginx proxies /api /ws and SPA routes")
}

if (!/EXPOSE\s+80/i.test(dockerfile)) {
  fail("Dockerfile must EXPOSE 80")
} else {
  ok("EXPOSE 80")
}

if (!process.exitCode) {
  console.log("All CV-199 web Dockerfile checks passed.")
}
