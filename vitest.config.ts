import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig, configDefaults } from 'vitest/config'

// Repo root — mirrors the `@/*` -> `./*` alias from tsconfig.json so tests can
// import engine/level modules as `@/lib/...`, `@/features/...`.
const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '.claude/**', 'out/**', '.next/**'],
    passWithNoTests: true,
  },
})
