import { expect, test } from '@playwright/test'

const heroPreload = 'link[rel="preload"][as="image"][href="/hero-vault-brass.webp"]'

test('preloads the LCP artwork only on localized landing pages', async ({ page }) => {
  for (const path of ['/', '/tr', '/pl']) {
    await page.goto(path)
    const preload = page.locator(heroPreload)

    await expect(preload).toHaveCount(1)
    await expect(preload).toHaveAttribute('fetchpriority', 'high')
  }

  await page.goto('/help')
  await expect(page.locator(heroPreload)).toHaveCount(0)
})

test('keeps the LCP copy immediately visible and trims early font competition', async ({ page }) => {
  await page.goto('/')

  const heroContent = page.locator('#hero-title').locator('..')
  await expect(heroContent).toBeVisible()
  expect(await heroContent.getAttribute('data-reveal')).toBeNull()
  await expect(page.locator('#method[data-reveal]')).toHaveCount(1)
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(3)
})
