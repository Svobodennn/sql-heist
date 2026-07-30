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

// Job 6 — The Confession (error-based). Canonical win (the-confession.json
// expectedSolution): claim an already-taken callsign so the INSERT trips SQLite's
// UNIQUE constraint and the raw error NAMES the hidden table. A targeted error IS
// the win, so it advances to Loot — where the error readout (ResultGrid, which
// prints the verbatim SQLite message) is shown, leaked table name and all.
const WIN = { callsign: 'ADMIN' } // already claimed -> UNIQUE constraint failure
const BENIGN = { callsign: 'NOVA-77' } // fresh -> inserts clean, leaks nothing
const HEADLINE = 'Loot secured'
const LEAKED = 'promo_claims' // the hidden table the error confesses

test.describe('Job 6 — The Confession (error-based)', () => {
  test('solvable end-to-end through the real UI', async ({ page }) => {
    await seedUnlockAllJobs(page)

    const exploit: Locator = await test.step(
      'Board (Act II) -> Brief -> Recon -> Exploit console (engine ready)',
      async () => {
        await openJobFromBoard(page, 'the-confession')
        return advanceToExploit(page)
      },
    )

    await test.step('a fresh callsign inserts clean and does NOT win (no leak)', async () => {
      // NB: the table name also lives in the live query preview ("what reaches the
      // mark"), so absence of the WORD proves nothing — the leak is the ERROR. A
      // clean insert raises no error, so the "structure exposed" tell never shows.
      await runPayload(page, exploit, BENIGN)
      await expectNotWon(page, exploit)
      await expect(page.getByText('structure exposed')).toHaveCount(0)
    })

    await test.step('reset clears the surface', async () => {
      await page.getByRole('button', { name: 'Reset' }).click()
      await expect(exploit.locator('#field-callsign')).toHaveValue('')
    })

    await test.step('a taken callsign -> UNIQUE error leaks the table -> WIN -> loot', async () => {
      await runPayload(page, exploit, WIN)
      await expectWon(page, HEADLINE)
      // The error panel appears on the loot screen and shows the leaked identifier.
      await expect(page.getByText('ERROR READOUT').first()).toBeVisible()
      await expect(page.getByText(LEAKED, { exact: false }).first()).toBeVisible()
    })

    await test.step('debrief shows the vulnerable <-> secure comparison', async () => {
      await openDebriefAndRevealAll(page)
    })

    await test.step('replay -> clean DB -> win path still works', async () => {
      const replay = await replayFromDebrief(page)
      await runPayload(page, replay, WIN)
      await expectWon(page, HEADLINE)
      await expect(page.getByText(LEAKED, { exact: false }).first()).toBeVisible()
    })
  })
})
