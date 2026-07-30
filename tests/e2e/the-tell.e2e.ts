import { test, expect, type Locator } from '@playwright/test'
import {
  seedUnlockAllJobs,
  openJobFromBoard,
  advanceToExploit,
  runPayload,
  expectWon,
  expectNotWon,
  oracleReadout,
  openDebriefAndRevealAll,
  replayFromDebrief,
} from './support'

// Job 4 — The Tell (blind-boolean). Canonical win (content/levels/the-tell.json
// expectedSolution): a boolean-oracle probe that pins the first PIN digit as '7'.
// A TRUE oracle (a row came back) IS the win, so it advances straight to Loot —
// the persistent readout we assert is the FALSE branch (a wrong digit), and the
// TRUE branch is proven by the Loot reveal.
const WIN = {
  code: "' OR (SELECT substr(master_pin,1,1) FROM vault_config WHERE id=1)='7' -- ",
}
const FALSE_PROBE = {
  code: "' OR (SELECT substr(master_pin,1,1) FROM vault_config WHERE id=1)='0' -- ",
}
const HEADLINE = 'Loot secured'

test.describe('Job 4 — The Tell (blind-boolean)', () => {
  test('solvable end-to-end through the real UI', async ({ page }) => {
    await seedUnlockAllJobs(page)

    const exploit: Locator = await test.step(
      'Board (Act II) -> Brief -> Recon -> Exploit console (engine ready)',
      async () => {
        await openJobFromBoard(page, 'the-tell')
        return advanceToExploit(page)
      },
    )

    await test.step('wrong digit -> oracle reads FALSE (the readout) and does NOT win', async () => {
      await runPayload(page, exploit, FALSE_PROBE)
      await expect(oracleReadout(page, 'FALSE')).toBeVisible()
      await expectNotWon(page, exploit)
    })

    await test.step('reset clears the surface', async () => {
      await page.getByRole('button', { name: 'Reset' }).click()
      await expect(exploit.locator('#field-code')).toHaveValue('')
    })

    await test.step('correct digit -> oracle TRUE -> WIN -> loot', async () => {
      // A TRUE oracle IS the win, so it advances to Loot immediately (the exploit
      // SignalPanel unmounts) — the win itself is the proof the oracle read TRUE.
      await runPayload(page, exploit, WIN)
      await expectWon(page, HEADLINE)
      // The player's own oracle payload is echoed on the loot screen.
      await expect(page.getByText('substr(master_pin,1,1)', { exact: false }).first()).toBeVisible()
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
