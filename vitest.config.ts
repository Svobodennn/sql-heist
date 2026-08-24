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
  // Match Next's automatic JSX runtime so .tsx compiles without an explicit
  // `import React` (components don't import it).
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    exclude: [...configDefaults.exclude, '.claude/**', 'out/**', '.next/**'],
    passWithNoTests: true,
    // Engine/schema suites load sql.js under Node, while component tests need a
    // browser-like DOM. Vitest projects keep that boundary explicit without the
    // deprecated environmentMatchGlobs option.
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['**/*.{test,spec}.{ts,tsx}'],
          exclude: [
            ...configDefaults.exclude,
            '.claude/**',
            'out/**',
            '.next/**',
            'tests/components/**',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['tests/components/**/*.{test,spec}.{ts,tsx}'],
        },
      },
    ],
  },
})
