import { defineConfig, devices } from '@playwright/test'

// E2E config for SQL Heist. Drives the REAL static export (out/) served by a
// zero-dependency Node server — the same bytes that deploy to production.
//
// `testMatch: **/*.e2e.ts` keeps these specs OUT of the vitest suite, whose
// include pattern is `**/*.{test,spec}.{ts,tsx}` — so `npm test` and
// `npm run test:e2e` never pick up each other's files.
const PORT = 5055
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1, // WASM-per-page is heavy; serialize for deterministic engine loads.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node tests/e2e/static-server.mjs`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { PORT: String(PORT) },
  },
})
