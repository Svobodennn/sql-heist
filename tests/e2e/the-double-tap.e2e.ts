import { test, expect, type Locator } from '@playwright/test'
import {
  seedUnlockAllJobs,
  openJobFromBoard,
  advanceToExploit,
  runPayload,
  expectWon,
  expectNotWon,
  sideEffectReadout,
  openDebriefAndRevealAll,
  replayFromDebrief,
} from './support'

// Job 7 — The Double Tap (stacked-queries). Canonical win (the-double-tap.json
// expectedSolution): after the badge read, stack an UPDATE that flips the VAULT
// door open, then a verify SELECT. Two row-producing statements => an extra result
// set => the win, which advances to Loot. The side-effect readout lives in the
// exploit phase, so we assert it on non-winning probes (a plain badge = 1
// statement; a stacked UPDATE with no verify read = 2 statements but only one
// result set), then land the full three-statement payload for the win.
const WIN = {
  badge: "B-1001'; UPDATE door_acl SET granted = 1 WHERE door = 'VAULT'; SELECT door, granted FROM door_acl WHERE door = 'VAULT' -- ",
}
const BENIGN = { badge: 'B-1001' } // one statement — nothing stacked
const STACKED_NO_VERIFY = {
  // Stacks the real damage (the UPDATE) but no verify SELECT, so only one result
  // set surfaces — the side effect "landed" yet the win gate (>=2 sets) stays shut.
  badge: "B-1001'; UPDATE door_acl SET granted = 1 WHERE door = 'VAULT' -- ",
}
const HEADLINE = 'Loot secured'

test.describe('Job 7 — The Double Tap (stacked-queries)', () => {
  test('solvable end-to-end through the real UI', async ({ page }) => {
    await seedUnlockAllJobs(page)

    const exploit: Locator = await test.step(
      'Board (Act II) -> Brief -> Recon -> Exploit console (engine ready)',
      async () => {
        await openJobFromBoard(page, 'the-double-tap')
        return advanceToExploit(page)
      },
    )

    await test.step('a plain badge runs ONE statement and does NOT win', async () => {
      await runPayload(page, exploit, BENIGN)
      await expect(sideEffectReadout(page)).toContainText('1 statement')
      await expectNotWon(page, exploit)
    })

    await test.step('a stacked UPDATE (no verify) -> side-effect readout shows it landed, still no win', async () => {
      await runPayload(page, exploit, STACKED_NO_VERIFY)
      await expect(sideEffectReadout(page)).toContainText('2 statements')
      await expect(sideEffectReadout(page)).toContainText('side effect landed')
      await expectNotWon(page, exploit)
    })

    await test.step('reset clears the surface', async () => {
      await page.getByRole('button', { name: 'Reset' }).click()
      await expect(exploit.locator('#field-badge')).toHaveValue('')
    })

    await test.step('badge + UPDATE + verify SELECT -> extra result set -> WIN -> loot', async () => {
      await runPayload(page, exploit, WIN)
      await expectWon(page, HEADLINE)
      // The verify read on the loot screen proves the VAULT ACL flipped open.
      await expect(page.getByText('VAULT', { exact: false }).first()).toBeVisible()
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
