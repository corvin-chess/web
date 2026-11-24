/**
 * CV-197: two Playwright contexts finish rated and casual games via Quick pair.
 * Requires CORVIN_E2E=1 plus live server + seeded sessions (see CI / e2e-seed).
 */
import { expect, test } from "@playwright/test"
import {
  authedContext,
  openPlay,
  pickLobby,
  playUci,
  seedPlayers,
  waitEnded,
  waitPlaying,
} from "./helpers"

const players = seedPlayers()

test.describe("two-browser full games", () => {
  test.skip(
    process.env.CORVIN_E2E !== "1",
    "Set CORVIN_E2E=1 with server+Redis+Postgres+seed to run"
  )

  test("rated blitz: e2e4 e7e5 resign shows rating diff", async ({
    browser,
  }) => {
    const ctxA = await authedContext(browser, players.a)
    const ctxB = await authedContext(browser, players.b)
    const pageA = await openPlay(ctxA)
    const pageB = await openPlay(ctxB)

    await pickLobby(pageA, { rated: true, color: "White" })
    await pickLobby(pageB, { rated: true, color: "Black" })
    await pageA.getByRole("button", { name: "Quick pair" }).click()
    await pageB.getByRole("button", { name: "Quick pair" }).click()

    await waitPlaying(pageA)
    await waitPlaying(pageB)

    await expect(pageA.getByText("Your turn")).toBeVisible()
    await playUci(pageA, "e2", "e4")
    await expect(pageB.getByText("Your turn")).toBeVisible({ timeout: 15_000 })
    await playUci(pageB, "e7", "e5")
    await expect(pageA.getByText("Your turn")).toBeVisible({ timeout: 15_000 })

    await pageA.getByRole("button", { name: "Resign" }).click()
    await waitEnded(pageA, /You resigned|You lose/)
    await waitEnded(pageB, /Opponent resigned|You win/)
    await expect(pageA.getByText(/Rating [+-]/)).toBeVisible()
    await expect(pageB.getByText(/Rating [+-]/)).toBeVisible()

    await ctxA.close()
    await ctxB.close()
  })

  test("casual blitz: e2e4 resign has no rating diff", async ({ browser }) => {
    const ctxA = await authedContext(browser, players.a)
    const ctxB = await authedContext(browser, players.b)
    const pageA = await openPlay(ctxA)
    const pageB = await openPlay(ctxB)

    await pickLobby(pageA, { rated: false, color: "White" })
    await pickLobby(pageB, { rated: false, color: "Black" })
    await pageA.getByRole("button", { name: "Quick pair" }).click()
    await pageB.getByRole("button", { name: "Quick pair" }).click()

    await waitPlaying(pageA)
    await waitPlaying(pageB)

    await playUci(pageA, "e2", "e4")
    await expect(pageB.getByText("Your turn")).toBeVisible({ timeout: 15_000 })
    await pageB.getByRole("button", { name: "Resign" }).click()
    await waitEnded(pageB, /You resigned|You lose/)
    await waitEnded(pageA, /Opponent resigned|You win/)
    await expect(pageA.getByText(/Rating [+-]/)).toHaveCount(0)
    await expect(pageB.getByText(/Rating [+-]/)).toHaveCount(0)

    await ctxA.close()
    await ctxB.close()
  })
})
