import { defineConfig, devices } from "@playwright/test"

const origin = process.env.CORVIN_E2E_ORIGIN ?? "http://127.0.0.1:5173"

// CI must not exit 0 with every e2e test skipped.
if (process.env.CI && process.env.CORVIN_E2E !== "1") {
  throw new Error("CI requires CORVIN_E2E=1 for Playwright two-browser games")
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: origin,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  // Dev server supplies /api and /ws proxies to corvin-server (preview does not).
  webServer: process.env.CORVIN_E2E_MANAGED_WEBSERVER
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 5173",
        url: origin,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
