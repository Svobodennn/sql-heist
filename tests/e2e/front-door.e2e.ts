import { test, expect, type Locator } from '@playwright/test'
import {
  seedUnlockAllJobs,
  openJobFromBoard,
  advanceToExploit,
  runPayload,
  expectWon,
  expectNotWon,
  openDebriefAndRevealAll,
  replayFromDebrief,
} from './support'

// Job 1 — The Front Door (auth bypass). Canonical win (docs/PLAN.md §3):
// username = `admin' -- `, password = anything -> a row with is_admin = 1.
const WIN = { username: "admin' -- ", password: 'whatever-123' }
const BENIGN = { username: 'j.marlow', password: 'hunter2' } // real non-admin user
const HEADLINE = "YOU'RE IN."

test.describe('Job 1 — The Front Door', () => {
  test('solvable end-to-end through the real UI', async ({ page }) => {
    await seedUnlockAllJobs(page)

    const exploit: Locator = await test.step(
      'Board -> Brief -> Recon -> Exploit console (engine ready)',
      async () => {
        await openJobFromBoard(page, 'front-door')
        return advanceToExploit(page)
      },
    )

    await test.step('benign login does NOT win', async () => {
      await runPayload(page, exploit, BENIGN)
      await expectNotWon(page, exploit)
    })

    await test.step('reset clears the surface (throws away the tainted DB)', async () => {
      await page.getByRole('button', { name: 'Reset' }).click()
      await expect(exploit.locator('#field-username')).toHaveValue('')
      await expect(exploit.locator('#field-password')).toHaveValue('')
    })

    await test.step('canonical payload WINS -> loot reveals', async () => {
      await runPayload(page, exploit, WIN)
      await expectWon(page, HEADLINE)
      // The player's own winning payload is echoed on the loot screen.
      await expect(page.getByText("admin' --", { exact: false }).first()).toBeVisible()
    })

    await test.step('debrief shows the vulnerable <-> secure comparison', async () => {
      await openDebriefAndRevealAll(page)
    })

    await test.step('replay -> clean DB -> win path still works', async () => {
      const replay = await replayFromDebrief(page)
      await runPayload(page, replay, WIN)
      await expectWon(page, HEADLINE)
    })
  })
})
