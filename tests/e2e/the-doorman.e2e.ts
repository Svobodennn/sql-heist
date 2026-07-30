import { test, expect, type Locator } from '@playwright/test'
import {
  seedUnlockAllJobs,
  openJobFromBoard,
  advanceToExploit,
  runPayload,
  expectWon,
  expectNotWon,
  wafRejectBanner,
  openDebriefAndRevealAll,
  replayFromDebrief,
} from './support'

// Job 8 — The Doorman (waf-bypass). Canonical win (the-doorman.json
// expectedSolution): the naive `UNION SELECT` is on the doorman's blocklist and is
// rejected outright; splitting the phrase with an inline comment (`UNION/**/SELECT`
// = whitespace to SQLite) sails past the literal match and lifts the ledger loot.
const NAIVE = { q: "' UNION SELECT schematic, loot FROM archive_ledger -- " } // blocked
const WIN = { q: "' UNION/**/SELECT schematic, loot FROM archive_ledger -- " } // bypass
const HEADLINE = 'Loot secured'
const LOOT = 'LOOT-DOORMAN-5B1E9F0C'
const BLOCKED_TERM = 'UNION SELECT'

test.describe('Job 8 — The Doorman (waf-bypass)', () => {
  test('solvable end-to-end through the real UI', async ({ page }) => {
    await seedUnlockAllJobs(page)

    const exploit: Locator = await test.step(
      'Board (Act II) -> Brief -> Recon -> Exploit console (engine ready)',
      async () => {
        await openJobFromBoard(page, 'the-doorman')
        return advanceToExploit(page)
      },
    )

    await test.step('naive UNION SELECT is stopped by the doorman (WAF banner) and does NOT win', async () => {
      await runPayload(page, exploit, NAIVE)
      const banner = wafRejectBanner(page)
      await expect(banner).toBeVisible()
      await expect(banner).toContainText(BLOCKED_TERM) // names the phrase it blocked
      await expectNotWon(page, exploit)
      await expect(page.getByText(LOOT)).toHaveCount(0)
    })

    await test.step('reset clears the surface', async () => {
      await page.getByRole('button', { name: 'Reset' }).click()
      await expect(exploit.locator('#field-q')).toHaveValue('')
    })

    await test.step('comment-split UNION/**/SELECT slips past -> WIN -> loot flag revealed', async () => {
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
