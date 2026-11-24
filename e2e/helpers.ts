import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { PLAYER_A, PLAYER_B, PLAY_ORIGIN, type E2ePlayer } from "./fixtures"

export const authedContext = async (
  browser: Browser,
  player: E2ePlayer
): Promise<BrowserContext> => {
  const context = await browser.newContext({
    baseURL: PLAY_ORIGIN,
    locale: "en-US",
  })
  await context.addCookies([
    {
      name: "corvin_session",
      value: player.sessionHex,
      url: PLAY_ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
    },
  ])
  return context
}

export const openPlay = async (context: BrowserContext): Promise<Page> => {
  const page = await context.newPage()
  page.on("dialog", (dialog) => {
    void dialog.accept()
  })
  await page.goto("/play")
  await expect(page.getByRole("status").filter({ hasText: /E2e/ })).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByRole("button", { name: "Quick pair" })).toBeEnabled({
    timeout: 30_000,
  })
  return page
}

export const pickLobby = async (
  page: Page,
  opts: { rated: boolean; color: "White" | "Black" }
) => {
  const blitz = page.getByRole("button", { name: "Blitz" })
  await blitz.click()
  await expect(blitz).toHaveAttribute("aria-pressed", "true")
  const ratedBtn = page.getByRole("button", {
    name: opts.rated ? "Rated" : "Casual",
  })
  await ratedBtn.click()
  await expect(ratedBtn).toHaveAttribute("aria-pressed", "true")
  const colorBtn = page.getByRole("button", { name: opts.color })
  await colorBtn.click()
  await expect(colorBtn).toHaveAttribute("aria-pressed", "true")
}

export const clickSquare = async (page: Page, algebraic: string) => {
  await page.locator(`[data-square="${algebraic}"]`).click()
}

export const playUci = async (
  page: Page,
  from: string,
  to: string,
  expectedSan?: string
) => {
  await clickSquare(page, from)
  await clickSquare(page, to)
  if (expectedSan) {
    await expect(page.getByTestId("move-live")).toContainText(expectedSan, {
      timeout: 15_000,
    })
  }
}

export const waitPlaying = async (page: Page) => {
  await expect(page.getByText(/Your turn|Opponent's turn/)).toBeVisible({
    timeout: 30_000,
  })
}

export const waitEnded = async (page: Page, pattern: RegExp) => {
  await expect(page.getByText(pattern)).toBeVisible({ timeout: 30_000 })
}

export const seedPlayers = () => ({ a: PLAYER_A, b: PLAYER_B })
