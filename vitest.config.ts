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
    // Node by default (engine/schema suites load the sql.js WASM under Node); only
    // the component suite needs a DOM, so it opts into jsdom by path.
    environment: 'node',
    environmentMatchGlobs: [['tests/components/**', 'jsdom']],
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, '.claude/**', 'out/**', '.next/**'],
    passWithNoTests: true,
  },
})
