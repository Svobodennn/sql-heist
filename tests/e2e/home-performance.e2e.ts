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

test('loads the mobile case deck from responsive AVIF sources', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const pictures = page.locator('a[aria-labelledby^="home-case-"] picture')
  await expect(pictures).toHaveCount(3)

  const firstPicture = pictures.first()
  const fallback = firstPicture.locator('img')
  await expect(firstPicture.locator('source[type="image/avif"]')).toHaveAttribute(
    'srcset',
    /case-front-door-640\.avif 640w, \/cinematic-breach\/case-front-door-1280\.avif 1280w/,
  )
  await expect(firstPicture.locator('source[type="image/webp"]')).toHaveAttribute(
    'srcset',
    /case-front-door-640\.webp 640w, \/cinematic-breach\/case-front-door-1280\.webp 1280w/,
  )
  await expect(fallback).toHaveAttribute('loading', 'lazy')

  await fallback.scrollIntoViewIfNeeded()
  await expect.poll(() => fallback.evaluate((image) => (image as HTMLImageElement).currentSrc)).toMatch(
    /case-front-door-640\.avif$/,
  )
})
