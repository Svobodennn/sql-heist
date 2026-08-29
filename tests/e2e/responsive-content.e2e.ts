import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 320, height: 700 } })

test('Polish legal copy wraps without horizontal page overflow', async ({ page }) => {
  await page.goto('/pl/terms')

  await expect(page.getByRole('heading', { name: 'Warunki korzystania', level: 1 })).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))

  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})
