import { test, expect, type Locator } from '@playwright/test'
import {
  seedUnlockAllJobs,
  openJobFromBoard,
  advanceToExploit,
  runPayload,
  expectWon,
  expectNotWon,
  timingReadout,
  openDebriefAndRevealAll,
  replayFromDebrief,
} from './support'

// Job 5 — The Stopwatch (blind-timing, MODELED). Canonical win (the-stopwatch.json
// expectedSolution): a CASE-WHEN oracle that makes the gate "drag" only when an
// OMEGA-clearance row exists. The slow (TRUE) branch surfaces a row, which is the
// win, so it advances straight to Loot — the persistent timing readout we assert
// is the FAST branch (a clearance that does not exist), proven not-won.
const WIN = {
  token: "' OR (SELECT CASE WHEN COUNT(*)>0 THEN 1 ELSE 0 END FROM staff WHERE clearance='OMEGA')=1 -- ",
}
const FAST_PROBE = {
  token: "' OR (SELECT CASE WHEN COUNT(*)>0 THEN 1 ELSE 0 END FROM staff WHERE clearance='ZULU')=1 -- ",
}
const HEADLINE = 'Loot secured'

test.describe('Job 5 — The Stopwatch (blind-timing)', () => {
  test('solvable end-to-end through the real UI', async ({ page }) => {
    await seedUnlockAllJobs(page)

    const exploit: Locator = await test.step(
      'Board (Act II) -> Brief -> Recon -> Exploit console (engine ready)',
      async () => {
        await openJobFromBoard(page, 'the-stopwatch')
        return advanceToExploit(page)
      },
    )

    await test.step('absent clearance -> timing meter reads FAST and does NOT win', async () => {
      await runPayload(page, exploit, FAST_PROBE)
      await expect(timingReadout(page)).toBeVisible()
      // The FAST (no-delay) branch — the discriminator that this is not the win.
      await expect(page.getByRole('group', { name: /Modeled response .*\(fast\)/ })).toBeVisible()
      await expectNotWon(page, exploit)
    })

    await test.step('reset clears the surface', async () => {
      await page.getByRole('button', { name: 'Reset' }).click()
      await expect(exploit.locator('#field-token')).toHaveValue('')
    })

    await test.step('OMEGA exists -> slow branch fires -> WIN -> loot', async () => {
      // The slow branch surfaces a row (the win), so it advances to Loot at once —
      // the win itself is the proof the timing oracle dragged (TRUE).
      await runPayload(page, exploit, WIN)
      await expectWon(page, HEADLINE)
      await expect(page.getByText("clearance='OMEGA'", { exact: false }).first()).toBeVisible()
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
