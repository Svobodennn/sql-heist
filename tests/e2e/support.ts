import { expect, type Page, type Locator } from '@playwright/test'

// Shared black-box drivers for the SQL Heist E2E specs. No app internals are
// imported — the tests exercise the shipped UI exactly as a player would, using
// the canonical winning payloads from docs/PLAN.md §3.
//
// This file is NOT a spec (it does not match `*.e2e.ts`), so the Playwright
// runner never executes it directly.

const PROGRESS_KEY = 'sql-heist:progress:v1'

// Seed localStorage BEFORE any page script runs so the Job Board's linear-unlock
// gate shows every card as clickable. The board's lock is a UI gate only; the
// route itself is statically generated for all 3 jobs. We still drive the REAL
// board (open each job by clicking its card link).
export async function seedUnlockAllJobs(page: Page): Promise<void> {
  await page.addInitScript(
    ([key]) => {
      const done = { completed: true, bestScore: 1000 }
      window.localStorage.setItem(
        key,
        JSON.stringify({ 'front-door': done, vault: done, blueprint: done }),
      )
    },
    [PROGRESS_KEY],
  )
}

// Job Board -> open the job by clicking its card link.
export async function openJobFromBoard(page: Page, jobId: string): Promise<void> {
  await page.goto('/jobs')
  await expect(page.getByRole('heading', { name: 'Three jobs. One score.' })).toBeVisible()
  const card = page.locator(`a[href="/jobs/${jobId}"]`).first()
  await expect(card).toBeVisible()
  await card.click()
  await expect(page).toHaveURL(new RegExp(`/jobs/${jobId}/?$`))
}

// Brief -> Recon -> Exploit. Returns the exploit console region and only resolves
// once the WASM engine is READY (the "Send it" button is enabled). If the engine
// never loads, this throws — which is the correct "job is unplayable" signal.
export async function advanceToExploit(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Take the job' }).click()
  await page.getByRole('button', { name: 'Make your move' }).click()

  const exploit = page.locator('section[aria-label="Exploit console"]')
  await expect(exploit).toBeVisible()

  const sendIt = page.getByRole('button', { name: 'Send it' })
  // Engine warm-up (sql.js/WASM). Generous window; disabled until status==='ready'.
  await expect(sendIt).toBeEnabled({ timeout: 30_000 })
  return exploit
}

// Fill the mimic field(s) and hit the wire. Payloads are set verbatim (trailing
// spaces after `-- ` are significant for the SQLite line comment).
export async function runPayload(
  page: Page,
  exploit: Locator,
  fields: Record<string, string>,
): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    const input = exploit.locator(`#field-${name}`)
    await expect(input).toBeVisible()
    await input.fill(value)
    await expect(input).toHaveValue(value)
  }
  await page.getByRole('button', { name: 'Send it' }).click()
}

// The Loot screen is reached only on a win; its "See how they slipped" CTA is the
// unambiguous marker (it exists on no other phase).
export function lootCta(page: Page): Locator {
  return page.getByRole('button', { name: 'See how they slipped' })
}

export async function expectWon(page: Page, headline: string): Promise<void> {
  await expect(lootCta(page)).toBeVisible()
  await expect(page.getByText(headline, { exact: false }).first()).toBeVisible()
}

export async function expectNotWon(page: Page, exploit: Locator): Promise<void> {
  await expect(exploit).toBeVisible()
  await expect(lootCta(page)).toHaveCount(0)
}

// Loot -> Debrief, then reveal all 4 beats so the vulnerable<->secure CodeCompare
// (beat ③) and takeaway (beat ④) are on screen. Returns nothing; asserts the
// comparison is present.
export async function openDebriefAndRevealAll(page: Page): Promise<void> {
  await lootCta(page).click()
  // On first entry only beat ① is shown, so "Continue" confirms we're in Debrief.
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()

  // revealed starts at 1; click "Continue" until it disappears (all 4 shown).
  for (let i = 0; i < 4; i++) {
    const cont = page.getByRole('button', { name: 'Continue' })
    if ((await cont.count()) === 0 || !(await cont.isVisible())) break
    await cont.click()
  }

  // The mandatory attack<->defense comparison (Debrief beat ③, <CodeCompare>).
  await expect(page.getByText('Vulnerable', { exact: true })).toBeVisible()
  await expect(page.getByText('Secure', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run it cleaner' })).toBeVisible()
}

// Debrief "Run it cleaner" -> replay from a clean slate back in Exploit. Confirms
// the engine is READY again on the fresh session.
export async function replayFromDebrief(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Run it cleaner' }).click()
  const exploit = page.locator('section[aria-label="Exploit console"]')
  await expect(exploit).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send it' })).toBeEnabled({ timeout: 30_000 })
  return exploit
}
