import { expect, test } from '@playwright/test'

test('locale root navigation preserves browser state and serves build-time lang', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Got it' }).click()
  await page.evaluate(() => {
    const view = window as Window & { __sqlHeistRootMarker?: boolean }
    view.__sqlHeistRootMarker = true
  })

  await page.getByRole('button', { name: 'Language: English' }).click()
  await page.getByRole('button', { name: 'Türkçe' }).click()

  await expect(page).toHaveURL('/tr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await expect(page.getByRole('button', { name: 'Anladım' })).toHaveCount(0)

  const state = await page.evaluate(() => ({
    consent: window.localStorage.getItem('sql-heist:consent:v1'),
    locale: window.localStorage.getItem('sql-heist:locale'),
    oldDocumentMarker: '__sqlHeistRootMarker' in window,
  }))

  expect(state).toEqual({ consent: '1', locale: 'tr', oldDocumentMarker: false })
})

test('page templates remount during client navigation in both locale trees', async ({ page }) => {
  const routes = [
    { start: '/', destination: '/help', link: 'Help' },
    { start: '/tr', destination: '/tr/help', link: 'Yardım' },
  ] as const

  for (const route of routes) {
    await page.goto(route.start)
    const template = page.locator('[data-page-template]')
    await expect(template).toHaveCount(1)
    await template.evaluate((node) => node.setAttribute('data-previous-template', 'true'))

    await page.getByRole('link', { name: route.link, exact: true }).first().click()

    await expect(page).toHaveURL(route.destination)
    await expect(page.locator('[data-previous-template="true"]')).toHaveCount(0)
    await expect(page.locator('[data-page-template]')).toHaveCSS('animation-name', /page-enter/)
  }
})
