# Refactor — Colocated · SRP · Layered

Goal: per-component folders (component + css + test + `index.ts` colocated); strict
SRP (UI in components, pure logic in lib); one-way layered dependencies with `i18n/`
and `ui/` as shared cross-cutting layers. **No URL/route changes.** All 291 unit +
8 E2E green at the end of every phase.

## Target layout

```
lib/                      engine + schema (frozen, pure — UNTOUCHED)
  engine/  schema/

i18n/                     NEW shared layer — translation (moved out of app/)
  I18nProvider.tsx  useTranslation.ts  translate.ts  config.ts  messages.ts  server.ts

ui/                       NEW shared layer — generic UI primitives
  icons/                  the 5 icons currently duplicated in app + features

features/game/
  components/
    CodeCompare/          CodeCompare.tsx · CodeCompare.module.css · index.ts   (+ .test.tsx later)
    JobPlayer/            …
    …                     (28 components, each its own folder)
  lib/                    pure game logic (already colocated: phaseMachine, secureCode, …)
  levels.ts               server-safe registry

app/
  (routes: page.tsx, jobs/, help/, faq/, privacy/, terms/, contact/)
  components/
    Navbar/  Footer/  Logo/  CookieConsent/  ShareButton/  LanguageSwitcher/  ContentPage/ …
      X.tsx · X.module.css · index.ts

tests/                    integration only — E2E (per-flow) + golden (per-level) STAY here
```

## Layering — one-way, downward only

```
app/  ──▶  features/  ──▶  i18n/ · ui/  ──▶  lib/ (engine, schema)
```

A layer imports only from itself or below. `features → app` is **forbidden** — that
is today's only real violation (22 game components import `@/app/i18n/useTranslation`);
moving i18n to the shared `i18n/` layer fixes it.

## SRP rule

- `components/X/X.tsx` → presentation + local UI state ONLY (no business logic).
- `features/game/lib/` → pure, testable logic, no JSX.
- Inline logic living in a component gets extracted into `lib/` (unit-testable),
  the component just renders it.

## Phases — each ends green (typecheck + `vitest run` + `build` + `test:e2e`)

- **P1 — Shared layers.** Create `i18n/` (move `app/i18n/*`), create `ui/icons/`
  (dedupe the 5 duplicated icons). Rewrite the 22 `features→app` i18n imports +
  app imports. Removes the layering violation.
- **P2 — features/game/components → folders.** 28 components, each into its own
  folder + `index.ts`. External importers using `@/features/game/components/X`
  resolve to `X/index.ts` unchanged; only intra-folder sibling imports shift.
- **P3 — app/components → folders.** Same for the 9 app components.
- **P4 — SRP extraction.** Pull remaining inline logic from components into
  `features/game/lib/` (candidates: CodeCompare tab logic, ExploitConsole, others
  as found). Components become render-only.
- **P5 — Config sweep.** `tsconfig` paths (`@/i18n`, `@/ui`), vitest/playwright
  globs, dead-file cleanup, final full verify.

## Invariants

- Component unit tests are NOT written now (folders are test-ready; E2E already
  covers the 8 full flows). Added incrementally later.
- Golden (per-level) + E2E (per-flow) tests are not component-scoped → stay in `tests/`.
- `lib/engine` + `lib/schema` are frozen — not touched.
- No route/URL change → the deferred SEO workstream is unaffected.
