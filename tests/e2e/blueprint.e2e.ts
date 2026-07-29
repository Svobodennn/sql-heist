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

// Job 3 — The Blueprint (schema discovery + UNION, hidden table). Canonical win
// (PLAN §3): q = ' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a --
const WIN = { q: "' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- " }
const BENIGN = { q: 'Security' } // matches a real article, surfaces no loot
const HEADLINE = 'GOT THE PLANS.'
const LOOT = 'LOOT-BLUEPRINT-3D1F8A22'

test.describe('Job 3 — The Blueprint', () => {
  test('solvable end-to-end through the real UI', async ({ page }) => {
    await seedUnlockAllJobs(page)

    const exploit: Locator = await test.step(
      'Board -> Brief -> Recon -> Exploit console (engine ready)',
      async () => {
        await openJobFromBoard(page, 'blueprint')
        return advanceToExploit(page)
      },
    )

    await test.step('benign archive search does NOT win (no loot surfaces)', async () => {
      await runPayload(page, exploit, BENIGN)
      await expectNotWon(page, exploit)
      await expect(page.getByText(LOOT)).toHaveCount(0)
    })

    await test.step('reset clears the surface (throws away the tainted DB)', async () => {
      await page.getByRole('button', { name: 'Reset' }).click()
      await expect(exploit.locator('#field-q')).toHaveValue('')
    })

    await test.step('UNION-on-hidden-table payload WINS -> loot flag revealed', async () => {
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
