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
  goals: string[]
  steps: Step[]
}

const CASES: CaseSpec[] = [
  {
    id: 'the-front-door',
    number: '001',
    title: 'The Front Door',
    headline: "WE'RE IN.",
    goals: [
      'Get inside as an administrator.',
      'List the rooms Meridian keeps off its own floor plan.',
      'Pull the offshore ledger you just mapped off the shopping page.',
    ],
    steps: [
      { username: "' OR '1'='1' -- ", password: 'x' },
      { q: "' UNION SELECT name, sql FROM sqlite_master -- " },
      { q: "' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- " },
    ],
  },
  {
    id: 'the-quiet-room',
    number: '002',
    title: 'The Quiet Room',
    headline: 'IT TALKED.',
    goals: [
      'Read one digit of the master PIN from a yes/no tell.',
      "Prove the pried PIN is live — read it off the vault gate's clock.",
      'Force a duplicate error that names the hidden claims table.',
    ],
    steps: [
      { code: "' OR (SELECT substr(master_pin,1,1) FROM vault_config WHERE id=1)='7' -- " },
      { token: "' OR (SELECT master_pin FROM vault_config WHERE id=1)='7731' -- " },
      { callsign: 'ADMIN' },
    ],
  },
  {
    id: 'the-vault',
    number: '003',
    title: 'The Vault',
    headline: "VAULT'S OPEN.",
    goals: [
      "Slip the blocked phrase past the doorman and lift the vault's door key.",
      "Stack a write onto the badge read and flip the vault's ACL to OPEN.",
    ],
    steps: [
      { q: "' UNION/**/SELECT schematic, loot FROM archive_ledger -- " },
      {
        badge:
          "B-1001'; UPDATE door_acl SET granted = 1 WHERE door = 'VLT-DOOR-3E9A'; SELECT door, granted FROM door_acl WHERE door = 'VLT-DOOR-3E9A' -- ",
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

async function enterFirstObjective(page: Page): Promise<void> {
  await page.goto('/cases')
  await dismissCookie(page)
  await page.locator('[data-case-id="the-front-door"] a').click()
  await page.getByRole('button', { name: 'Take the case' }).click()
  await expect(page.getByRole('heading', { name: CASES[0].goals[0] })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send it' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Enter operation' }).click()
  await expect(page.getByRole('button', { name: 'Send it' })).toBeEnabled({ timeout: 20000 })
}

async function expectBoardRevealReady(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/cases\/?$/)
  const boardHeader = page.locator('header[data-reveal]').filter({ hasText: 'Pick your mark.' })
  await expect(boardHeader).toHaveAttribute('data-reveal-visible', 'true')
}

test.describe('Case board return navigation', () => {
  test('reveals the board after using the navbar Cases link', async ({ page }) => {
    await enterFirstObjective(page)

    await page.getByRole('link', { name: 'Cases', exact: true }).first().click()

    await expectBoardRevealReady(page)
  })

  test('reveals the board after using browser back', async ({ page }) => {
    await enterFirstObjective(page)

    await page.goBack()

    await expectBoardRevealReady(page)
  })
})

test.describe('Mobile case navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('keeps the command sheet and live operation inside the viewport', async ({ page }) => {
    await page.goto('/cases/the-front-door')
    await dismissCookie(page)

    await page.getByRole('button', { name: 'Open menu' }).click()
    const menu = page.getByRole('dialog', { name: 'Primary' })
    await expect(menu).toBeVisible()

    const menuBounds = await menu.boundingBox()
    expect(menuBounds?.width).toBe(390)
    expect(menuBounds?.height).toBeGreaterThanOrEqual(840)

    await page.getByRole('button', { name: 'Close menu' }).click()
    await page.getByRole('button', { name: 'Take the case' }).click()
    await page.getByRole('button', { name: 'Enter operation' }).click()
    await expect(page.getByRole('button', { name: 'Send it' })).toBeEnabled({ timeout: 20000 })

    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth)
    const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(contentWidth).toBe(viewportWidth)
  })
})

for (const gameCase of CASES) {
  test.describe(`Case ${gameCase.number} — ${gameCase.title}`, () => {
    test('plays through every objective to the case-closed payoff', async ({ page }) => {
      await page.goto(`/cases/${gameCase.id}`)
      await dismissCookie(page)

      // Guided flow: briefing → objective review → operation for every objective.
      await page.getByRole('button', { name: 'Take the case' }).click()

      const total = gameCase.steps.length
      for (let i = 0; i < total; i++) {
        await test.step(`objective ${i + 1}/${total}`, async () => {
          // The player reads the objective before entering, and the same banner
          // remains visible above the live target once the operation opens.
          await expect(page.getByRole('heading', { name: gameCase.goals[i] })).toBeVisible()
          await page.getByRole('button', { name: 'Enter operation' }).click()
          await expect(page.getByRole('heading', { name: gameCase.goals[i] })).toBeVisible()
          await expect(page.getByText(`Objective ${i + 1}/${total}`)).toBeVisible()
          // Engine loads WASM while the brief/review is read — wait until armed.
          await expect(page.getByRole('button', { name: 'Send it' })).toBeEnabled({
            timeout: 20000,
          })
          await fillAndSend(page, gameCase.steps[i])
          // A win lands on the payoff screen; Next advances (last Next → case closed).
          const next = page.getByRole('button', { name: 'Next' })
          await expect(next).toBeVisible({ timeout: 15000 })
          await next.click()
        })
      }

      await expect(page.getByText(gameCase.headline).first()).toBeVisible({ timeout: 15000 })

      await page.getByRole('link', { name: 'Back to the board', exact: true }).click()
      await expect(page).toHaveURL(/\/cases\/?$/)
      await expect(
        page.getByRole('heading', { name: 'Pick your mark.', exact: true }),
      ).toBeVisible()
      await expect(page.locator(`[data-case-id="${gameCase.id}"]`)).toBeVisible()
    })
  })
}
