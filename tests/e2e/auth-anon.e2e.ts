import { test, expect } from '@playwright/test'

// The anonymous path must NEVER talk to Supabase — with or without env baked into
// the build. Env-less builds disable auth entirely; env-full builds only read the
// locally-stored session (empty for an anonymous visitor). This pins the P0
// invariant that accounts change nothing for signed-out play, in BOTH build flavors.
test('anonymous browsing makes zero Supabase requests and surfaces no auth errors', async ({
  page,
}) => {
  const supabaseRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('supabase.co')) supabaseRequests.push(request.url())
  })
  // Scoped to auth/supabase so an unrelated console regression can't hide here.
  const authErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /supabase|auth/i.test(message.text()))
      authErrors.push(message.text())
  })

  await page.goto('/')
  await expect(page.getByRole('link', { name: 'SQL Heist — home' })).toBeVisible()
  await page.goto('/cases')
  await expect(page.getByRole('heading', { name: 'Pick your mark.' })).toBeVisible()

  expect(supabaseRequests).toEqual([])
  expect(authErrors).toEqual([])
})
