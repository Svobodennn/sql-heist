import { test, expect, type Page } from '@playwright/test'

// Cases (P4) — each case is playable end-to-end through the REAL UI: solve every
// objective in order against the shared persistent DB, auto-advancing on each win,
// to the case-closed payoff. The winning inputs mirror each objective's authored
// expectedSolution (the golden suite proves those solve; this proves the UI flow).

type Step = Record<string, string>
interface CaseSpec {
  id: string
  number: string
  title: string
  headline: string
  steps: Step[]
}

const CASES: CaseSpec[] = [
  {
    id: 'the-front-door',
    number: '001',
    title: 'The Front Door',
    headline: "WE'RE IN.",
    steps: [
      { username: "' OR '1'='1' -- ", password: 'x' },
      { q: "' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- " },
      { q: "' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- " },
    ],
  },
  {
    id: 'the-quiet-room',
    number: '002',
    title: 'The Quiet Room',
    headline: 'IT TALKED.',
    steps: [
      { code: "' OR (SELECT substr(master_pin,1,1) FROM vault_config WHERE id=1)='7' -- " },
      { token: "' OR (SELECT CASE WHEN COUNT(*)>0 THEN 1 ELSE 0 END FROM staff WHERE clearance='OMEGA')=1 -- " },
      { callsign: 'ADMIN' },
    ],
  },
  {
    id: 'the-vault',
    number: '003',
    title: 'The Vault',
    headline: "VAULT'S OPEN.",
    steps: [
      { q: "' UNION/**/SELECT schematic, loot FROM archive_ledger -- " },
      {
        badge:
          "B-1001'; UPDATE door_acl SET granted = 1 WHERE door = 'VAULT'; SELECT door, granted FROM door_acl WHERE door = 'VAULT' -- ",
      },
    ],
  },
]

async function dismissCookie(page: Page): Promise<void> {
  const gotIt = page.getByRole('button', { name: 'Got it' })
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click()
}

async function fillAndSend(page: Page, inputs: Step): Promise<void> {
  for (const [name, value] of Object.entries(inputs)) {
    await page.locator(`#field-${name}`).fill(value)
  }
  await page.getByRole('button', { name: 'Send it' }).click()
}

for (const gameCase of CASES) {
  test.describe(`Case ${gameCase.number} — ${gameCase.title}`, () => {
    test('plays through every objective to the case-closed payoff', async ({ page }) => {
      await page.goto(`/cases/${gameCase.id}`)
      await dismissCookie(page)

      // Engine loads WASM off first paint — wait until the wire is armed.
      await expect(page.getByRole('button', { name: 'Send it' })).toBeEnabled({ timeout: 20000 })

      const total = gameCase.steps.length
      for (let i = 0; i < total; i++) {
        await test.step(`objective ${i + 1}/${total}`, async () => {
          await expect(page.getByText(`Objective ${i + 1}/${total}`)).toBeVisible()
          await fillAndSend(page, gameCase.steps[i])
          if (i < total - 1) {
            await expect(page.getByText(`Objective ${i + 2}/${total}`)).toBeVisible({ timeout: 15000 })
          }
        })
      }

      await expect(page.getByText(gameCase.headline).first()).toBeVisible({ timeout: 15000 })
    })
  })
}
