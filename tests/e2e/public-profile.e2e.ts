import { expect, test } from '@playwright/test'

test('serves clean public-profile paths through the locale-aware static shells', async ({
  page,
}) => {
  const english = await page.goto('/user/testuser')
  expect(english?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sqlheist.com/user/testuser',
  )
  await expect(page.locator('link[rel="alternate"][hreflang="tr"]')).toHaveAttribute(
    'href',
    'https://sqlheist.com/tr/user/testuser',
  )

  await page.getByRole('button', { name: 'Language: English' }).click()
  await page.getByRole('button', { name: 'Türkçe' }).click()
  await expect(page).toHaveURL(/\/tr\/user\/testuser$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://sqlheist.com/tr/user/testuser',
  )
})
