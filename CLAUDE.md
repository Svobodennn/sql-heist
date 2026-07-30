# SQL Heist — Project Conventions

Authoritative rules for how this repo is structured and how to work in it. Decide
structure UP FRONT here so we never refactor layout again. (Global commit/PR rules
still apply — English, lowercase `type(scope): desc`, single line, no AI trailers.)

## Architecture — layered, one-way dependencies

```
app/  ──▶  features/  ──▶  i18n/ · ui/  ──▶  lib/
```

A layer imports only from itself or a layer BELOW. **`features → app` is forbidden.**

| Layer | Holds | Rules |
|-------|-------|-------|
| `lib/engine`, `lib/schema` | Game engine + Zod schema | **Frozen, pure, NO React.** The injection/win logic lives here. |
| `i18n/` | Translation (provider, `useTranslation`, `translate`, messages) | Shared; imported by both app and features. |
| `ui/` | Shared UI primitives (`cx`, shared generic icons) | Shared; no domain logic. |
| `features/game/` | Game domain: `components/`, `lib/` (pure game logic), `levels.ts` | May import i18n/ui/lib. Never app. |
| `app/` | Next.js routes + app chrome (Navbar/Footer/…) | Top layer; static pages stay Server Components. |

## Colocation (source files)

- Every component lives in **its own folder**: `X/X.tsx` + `X/X.module.css` + `X/index.ts` (`export * from './X'`).
- The CSS module sits **beside** its component. Import own styles as `./X.module.css`.
- A cohesive multi-file unit is grouped in one folder (e.g. `ContentPage/` holds `ContentPage.tsx` + `content-blocks.tsx` + `content.module.css`).
- Shared icon modules (`icons.tsx`, `langIcons.tsx`) stay flat (they are modules, not single components).

## Tests — SEPARATE tree, mirrors src (LOCKED)

**Source dirs (`app/ features/ lib/ i18n/ ui/`) contain ZERO test files — code only.**
All tests live under `tests/`:

```
tests/
  unit/<area>/*.test.ts     unit tests (engine, schema, game, i18n, app)
  components/*.test.tsx      component tests (added when written)
  e2e/*.e2e.ts               Playwright, per-flow  (testMatch **/*.e2e.ts)
  levels/*.golden.test.ts    per-level golden tests
```

- Tests import their subject via the `@/` alias — **never** a relative path into source.
- Vitest picks up `**/*.{test,spec}.{ts,tsx}`; e2e are excluded from vitest via `.e2e.ts`.

## SRP

- Components = presentation + local UI state **only**. No business/pure logic in a component.
- Pure/reusable logic → `lib/` or `features/game/lib/` (no JSX), where it is unit-testable.

## How to work here (avoid the churn)

1. **Big change → audit first** (evidence, file sizes, import direction), then a phased plan. No big-bang.
2. **Every phase ends GREEN before the next:** `npm run typecheck` && `npm test` && `npm run build` && `npm run test:e2e`.
3. **Always `npm run build` after moving/renaming files, CSS-module imports, or `import.meta.url` paths.** `tsc` does NOT resolve CSS-module imports or runtime WASM URLs — only the build (webpack) and the test run catch those. (This bit us moving `.module.css` and the `sql-wasm.wasm` test path.)
4. **Commit one logical phase at a time, scoped**; get explicit approval before commit/push.
5. `lib/engine` + `lib/schema` are frozen — extend the win-DSL additively (optional fields), never break them.
