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

// Job 2 — The Vault (column-count + UNION extraction). Canonical win (PLAN §3):
// q = ' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts --
const WIN = {
  q: "' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- ",
}
const BENIGN = { q: 'Titanium' } // matches a real product, surfaces no loot
const HEADLINE = "VAULT'S OPEN."
const LOOT = 'LOOT-VAULT-9F2C4471'

test.describe('Job 2 — The Vault', () => {
  test('solvable end-to-end through the real UI', async ({ page }) => {
    await seedUnlockAllJobs(page)

    const exploit: Locator = await test.step(
      'Board -> Brief -> Recon -> Exploit console (engine ready)',
      async () => {
        await openJobFromBoard(page, 'vault')
        return advanceToExploit(page)
      },
    )

    await test.step('benign product search does NOT win (no loot surfaces)', async () => {
      await runPayload(page, exploit, BENIGN)
      await expectNotWon(page, exploit)
      await expect(page.getByText(LOOT)).toHaveCount(0)
    })

    await test.step('reset clears the surface (throws away the tainted DB)', async () => {
      await page.getByRole('button', { name: 'Reset' }).click()
      await expect(exploit.locator('#field-q')).toHaveValue('')
    })

    await test.step('UNION payload WINS -> loot flag revealed', async () => {
      await runPayload(page, exploit, WIN)
      await expectWon(page, HEADLINE)
      await expect(page.getByText(LOOT).first()).toBeVisible()
    })

    await test.step('debrief shows the vulnerable <-> secure comparison', async () => {
      await openDebriefAndRevealAll(page)
    })

    await test.step('replay -> clean DB -> win path still works', async () => {
      const replay = await replayFromDebrief(page)
      await runPayload(page, replay, WIN)
      await expectWon(page, HEADLINE)
      await expect(page.getByText(LOOT).first()).toBeVisible()
    })
  })
})
