# SQL Heist — Parallel Implementation Orchestration Directive

> Generated: 2026-07-30 · Orchestrator: maestro (planning advisor)
> Source scope: docs/ROADMAP.md (WS0–WS5) · engine contract: docs/PLAN.md §2
> Model: **file-zone ownership** — two agents NEVER write the same files, so disjoint
> zones merge conflict-free. **maestro does NOT dispatch. The parent (Hızır) executes
> every `Agent()` call below, honoring the wave/gate order and the parent contract at the end.**

---

## 0. File-zone ownership (the invariant that makes parallelism safe)

| Zone | Owns (writes) | Never touches |
|------|---------------|---------------|
| **Z-engine** | `lib/engine/*`, `lib/schema/level.ts` (+ its `.test.ts`), `lib/engine/__fixtures__/*`, `docs/01-architecture.md §3.2 ONLY` | `content/*`, `features/*`, `app/*` |
| **Z-content** | `content/levels/*.json` (existing + new) | `lib/*` (imports only), `features/*`, `app/*` |
| **Z-ui-game** | `features/game/*` | `lib/*` (imports only), `content/*`, `app/*` |
| **Z-app-shell** | `app/*` (layout, routes, new pages) + nav components (place under `app/components/*` or `app/(marketing)/*`) | `features/game/*`, `lib/*`, `content/*` |
| **Z-docs (auth)** | `docs/auth/*.md` (new dir) | everything else |

**Frozen-contract rule:** Z-engine (Wave 1) is the ONLY zone that edits `lib/`. Wave-2/3 tracks
**import from `lib/`, never edit it.** Downstream code adapts to the schema via the exported
`normalizeSecureCode()` accessor — it does not reshape engine types.

## 1. Global rules injected into EVERY prompt

- **English only:** all code, comments, identifiers, level-JSON, test names, commit messages in ENGLISH. (Existing Turkish `docs/` prose may remain; do not translate it.)
- **Keep the suite green throughout:** existing **108 unit/golden tests + 3 Playwright E2E** must stay green after every merge. All schema changes are **additive & back-compatible** (legacy shapes still parse).
- **Commits:** `type(scope): desc` — lowercase, single line, imperative, **NO** `Co-Authored-By`, no plan/phase refs.
- **Type contract (parallel-agent-contracts):** before creating a type, `grep -rn "interface Name\|type Name" lib/` — if it exists, import it. Canonical owner of ALL engine types is `lib/schema/level.ts`.
- **No XSS:** never introduce `dangerouslySetInnerHTML` (K7). Raw player input renders as text.

## 2. Worktree boilerplate (every `isolation: worktree` agent below)

```
WORKTREE SETUP (run FIRST):
1. Find your worktree root:  git rev-parse --show-toplevel   → call it <WT>.
   The main checkout is /Users/svoboden/development/sql-heist  → <MAIN>.
   If <WT> == <MAIN>, STOP and tell the parent your isolation was not a worktree.
2. node_modules is gitignored/absent in <WT>. Symlink it so tsc/vitest/next resolve:
      ln -s /Users/svoboden/development/sql-heist/node_modules <WT>/node_modules
   (skip if it already exists)
3. Edit ONLY files inside your zone, using absolute paths under <WT>. Never edit <MAIN>.

VERIFY (before handoff), one self-contained command so cwd stays stable:
      sh -c 'cd <WT> && npx tsc --noEmit && npx vitest run && npm run lint && npm run build'
   All must pass. .next/ and out/ stay in the worktree (gitignored — do NOT commit them).

COMMIT + HANDOFF (MANDATORY — worktree-handoff protocol; uncommitted work strands & is lost):
      git -C <WT> add -A
      git -C <WT> commit -m "<type(scope): desc>"
   End your FINAL message with:
      ## WORKTREE HANDOFF
      - Branch: <git -C <WT> branch --show-current>
      - Commit: <git -C <WT> rev-parse HEAD>
   Committing before you say COMPLETE is REQUIRED.
```

The **parent** pre-creates each worktree before dispatch, e.g.:
`git worktree add -b ws/engine /Users/svoboden/development/sql-heist-wt/engine HEAD`
and merges after the gate with `git merge --no-edit <commit-hash>` (see §Parent contract).

---

# WAVE 1 — freeze the contract + shell + audits + auth design (parallel_group 1)

All six run **simultaneously**: 3 audits are READ-ONLY in <MAIN>; 2 implementers are in isolated
worktrees; architect writes only new files in `docs/auth/`. No two write the same path.

```yaml
wave_1:
  parallel_group: 1

  - subagent_type: a11y-expert
    zone: none (READ-ONLY audit, main dir)
    isolation: none
    purpose: WS0 accessibility audit of the shipped game UI (baseline)
    dependencies: []
    prompt: |
      READ-ONLY audit. Do NOT edit any file. Audit the shipped SQL Heist game UI under
      features/game/* and app/* against docs/04-frontend-ux.md's promises. Verify, with
      file:line evidence for every finding:
      - Semantic Color Law is truly colorblind-safe (crimson=attack, jade=defense,
        brass=agency, steel=info) — color is NEVER the sole information carrier.
      - Keyboard navigation + focus order across all 5 screens + Job Board (tab order,
        visible focus, no traps), especially the Exploit split (THE FRONT ↔ THE WIRE).
      - AA contrast on the noir dark theme (#0B0D10 base). List failing pairs.
      - Touch targets >= 44px. ARIA/roles on the SQL preview, result grid, hint tray, toasts.
      - aria-live correctness (DebriefPanel uses aria-live="polite").
      Output a triaged list: SEVERITY (critical/high/medium/low) · file:line · fix hint.
      These findings feed Wave-2 Z-ui-game (features/game/*) — write fixes NOWHERE.
    accept_criteria: >
      Findings triaged by severity with file:line + concrete fix hint each; at least the
      color-law, keyboard/focus, contrast, and target-size dimensions each covered; NO files changed.

  - subagent_type: code-reviewer
    zone: none (READ-ONLY audit, main dir)
    isolation: none
    purpose: WS0 UI code review of features/game/*
    dependencies: []
    prompt: |
      READ-ONLY review (no edits). Review features/game/* for: component boundaries &
      responsibilities, file sizes (>800 lines = flag; target 200-400), dead/unused code,
      duplicated logic, prop drilling, and the K7 XSS ban (grep for dangerouslySetInnerHTML —
      there must be zero). Check that raw player input is rendered as TEXT everywhere. Confirm
      immutability (no state mutation) and error handling around engine calls (useEngine).
      Output findings as SEVERITY · file:line · recommended change. Fixes are applied later in
      Wave-2 Z-ui-game — do not edit anything now.
    accept_criteria: >
      Zero dangerouslySetInnerHTML confirmed (or flagged critical if found); each finding has
      file:line + fix; file-size outliers listed; NO files changed.

  - subagent_type: web-perf-expert
    zone: none (READ-ONLY audit, main dir)
    isolation: none
    purpose: WS0 web-perf pass (bundle, lazy boundaries, first-load)
    dependencies: []
    prompt: |
      READ-ONLY perf audit (no edits). The app is a Next.js static export (output:'export').
      /jobs/[jobId] first-load is ~159 kB today. Assess: sql.js/WASM lazy-load boundary
      (landing must ship NO WASM), code-split points, framer-motion import cost, font strategy
      (next/font self-host), and any eager import of the engine from a route that shouldn't need
      it. You MAY run `sh -c 'npm run build'` to read
      the build output/bundle sizes (build only; change nothing). Output: prioritized, low-risk
      perf fixes with file:line + expected saving. Fixes land in Wave-2 Z-ui-game / a follow-up.
    accept_criteria: >
      Reports current first-load numbers from a real build; >=3 prioritized fixes with file:line
      and rationale; confirms landing route ships no WASM (or flags it); NO source files changed.

  - subagent_type: kraken
    zone: Z-engine (lib/engine/*, lib/schema/level.ts + tests + __fixtures__, docs/01-architecture.md §3.2 ONLY)
    isolation: worktree
    purpose: Freeze the engine contract ONCE — WS0 P1 fixes + WS2 schema + WS3 engine/schema. TDD, additive, back-compatible.
    dependencies: []
    prompt: |
      [PASTE WORKTREE BOILERPLATE — §2 of docs/parallel-impl-directive.md]
      You OWN Z-engine only: lib/engine/*, lib/schema/level.ts (+ .test.ts), lib/engine/__fixtures__/*,
      and docs/01-architecture.md §3.2 (technical signatures only). NEVER touch content/, features/, app/.
      This is the ONE pass that freezes the contract for all downstream waves. Work TDD (test first),
      keep ALL existing tests green, and make EVERY change additive & back-compatible.

      A) WS0 P1 engine fixes:
        1. sqlLoader retry-path TEST. lib/engine/sqlLoader.ts already clears `cached` on a rejected
           boot (lines ~30-38). Add a test in tests/engine/sqlLoader.test.ts proving: a failed
           initSqlJs boot is NOT cached, and a subsequent loadSqlJs() retries (inject a locateFile/
           init that fails once then succeeds). Do not change runtime behavior unless the test proves a bug.
        2. visibleSchema COPY-ON-READ. lib/engine/levelSession.ts get visibleSchema() returns
           this.level.database.visibleSchema by reference — a caller can mutate the level. Return a
           fresh copy: visibleSchema.map(t => ({ table: t.table, columns: [...t.columns] })). Add a
           test: mutating the returned value does not affect a second read.
        3. exact-mode cardinality CLARIFY. lib/engine/winEvaluator.ts row-match `exact` currently
           checks ctx.columns.length === expectedKeys.length (column-count parity), not strict row
           equality. Align with docs/PLAN.md §2.3 + docs/01-architecture.md §5.2: keep behavior
           back-compatible (front-door subset golden must stay green) but make the intent explicit
           in code + comment, and add a focused unit test pinning exact-mode semantics.
        4. starsForScore MAGIC NUMBERS. lib/engine/scoring.ts hardcodes 900/600. Extract named
           constants (e.g. STAR_THRESHOLDS = { three: 900, two: 600 }) and use them; keep outputs identical.
        5. DOC DRIFT. Sync docs/01-architecture.md §3.2 ("Kontrat imzaları") `segments`/WinContext
           signature to the real composer/winEvaluator output. Minimal technical edit; leave
           surrounding Turkish prose intact. If the section/file is absent, skip and note it.

      B) WS2 schema — secureCode becomes per-stack, back-compatible:
        - Add `export const secureSnippetSchema = z.object({ id: z.string(), label: z.string(),
          language: z.string(), code: z.string() })` and `export type SecureSnippet`.
        - Change debrief.secureCode to a UNION that still accepts the legacy single {language,code}
          object AND a new SecureSnippet[] array:
            secureCode: z.union([codeSnippetSchema, z.array(secureSnippetSchema).min(1)])
          (existing 3 level JSONs keep the object form → golden tests stay green; content migrates in Wave 2).
        - Export a pure accessor `normalizeSecureCode(sc): SecureSnippet[]` that lifts the legacy
          object into a 1-element array (id:'default', label from language) and returns arrays as-is.
          Downstream UI imports THIS instead of reshaping. Unit-test both branches.

      C) WS3 engine + schema additions (all optional/additive → existing 3 levels unaffected):
        - Extend techniqueIdSchema with: 'error-based', 'blind-boolean', 'blind-timing',
          'stacked-queries', 'waf-bypass'.
        - Extend winConditionSchema (discriminated union on `type`) with deterministic, PURE members
          (no wall-clock; golden-testable):
            * 'blind-boolean' — recognizes a true/false oracle differentiation from the result
              (design the exact fields; e.g. a true-branch that must return rows and a distinguishing signal).
            * 'blind-timing' — a TIMING ORACLE modeled deterministically (NOT real elapsed time; the
              WASM engine is synchronous). Recognize the intended time-based branch symbolically so
              tests never flake. Document the model in a comment.
            * 'error-based' — a targeted error is the WIN. NOTE: evaluate() currently treats ANY
              ctx.error as an immediate lose (anti-trivial guard, line ~72). Add an error-based path
              that is checked BEFORE the generic guard and ONLY for this win type (e.g. required error
              signature / leaked substring in ctx.error), leaving the guard intact for all other types.
            * 'stacked-queries' — requires executing multiple statements and observing a side effect.
              Extend lib/engine/sqlRunner + levelSession minimally so a multi-statement payload's
              observable effect can be evaluated; keep single-statement behavior identical.
        - WAF/FILTER INPUT LAYER: add an OPTIONAL level field (e.g. `inputFilter?: { blocklist: string[],
          mode: 'reject'|'strip', message?: string }`) applied to raw input at compose time in
          queryComposer/levelSession BEFORE substitution. Absent → zero behavior change (the 3 MVP
          levels have no filter). This simulates a real WAF forcing bypass techniques; the injection
          contract (raw input, no escaping) is otherwise unchanged. Table-test reject + strip.

      Keep lib/engine/__fixtures__/* and lib/schema/level.test.ts consistent with the new schema
      (you own them). Do NOT edit content/levels/*.json (Z-content owns those). After all changes,
      the FULL existing suite + your new tests must pass.
      [RUN VERIFY + COMMIT + PRINT HANDOFF per boilerplate. Commit: "feat(engine): freeze post-mvp contract (ws0 fixes, ws2 secure-code array, ws3 techniques)".]
    accept_criteria: >
      tsc + full vitest (108 existing + new) + lint + build all green in the worktree; secureCode
      union accepts BOTH legacy object and array; normalizeSecureCode exported + tested; new
      technique enum values + new win-condition members + optional inputFilter all additive
      (the 3 MVP levels still parse & golden-test); error-based path bypasses the anti-trivial
      guard only for its own type; WORKTREE HANDOFF block printed with branch + commit hash.

  - subagent_type: frontend-dev
    zone: Z-app-shell (app/* + nav components under app/)
    isolation: worktree
    purpose: WS1 site shell — navbar + new marketing/legal pages + Share
    dependencies: []
    prompt: |
      [PASTE WORKTREE BOILERPLATE — §2 of docs/parallel-impl-directive.md]
      You OWN Z-app-shell only: app/* (app/layout.tsx, routes, new pages) and NEW nav components
      placed under app/ (e.g. app/components/Navbar.tsx). NEVER touch features/game/*, lib/*, content/*.
      In-game UX (back nav / exploit context / debrief tabs) is a DIFFERENT track (Wave-2 Z-ui-game) —
      do not build it here. Keep the static export working (output:'export'; no server code, no runtime fetch).

      Build the site shell in SQL-Noir taste adapted to OUR heist theme (noir dark-first #0B0D10,
      Semantic Color Law, Space Grotesk/Geist per docs/04-frontend-ux.md). You MAY fetch sqlnoir.com
      at build/design time for STRUCTURE & UX taste ONLY — never copy their content, copy, or branding.

      Deliver:
      1. Navbar (rendered from app/layout.tsx, wrapping all routes): Home · Jobs · Help · Share ·
         Language (en/tr/pl PLACEHOLDER — a disabled/no-op switcher; real i18n is WS4). Include a
         STUBBED auth entry point (e.g. "Sign in" link to a #wip anchor) for WS5. Keyboard-accessible,
         AA-contrast, 44px targets, visible focus, aria-current on the active link.
      2. New pages as static routes under app/: Help, FAQ, Privacy, Terms, Contact. Adapt SQL Noir's
         page INVENTORY/structure to our heist voice (The Fixer tone). Placeholder-but-plausible legal
         copy is fine now; do not invent false legal claims. Each page is server-rendered static.
      3. Share (app/share or a Share control): share the game link now; OPEN DECISION — a result card
         ("I cracked The Vault") is recommended-optional. Implement the LINK share (copy-to-clipboard +
         canonical URL) and scaffold the result-card as an optional, clearly-marked TODO if time-boxed.
      All display strings stay literal English now (WS4 will extract them). No hardcoded secrets.
      [RUN VERIFY + COMMIT + PRINT HANDOFF. Commit: "feat(app): navbar, help/faq/privacy/terms/contact pages, share".]
    accept_criteria: >
      npm run build (static export) succeeds with all new routes emitted to out/; navbar shows
      Home/Jobs/Help/Share/Language-placeholder + stubbed auth; the 5 pages render statically; link
      share works; a11y basics (focus, contrast, targets) met; features/game, lib, content untouched;
      WORKTREE HANDOFF printed.

  - subagent_type: architect
    zone: Z-docs (docs/auth/*.md — NEW, DOCS ONLY)
    isolation: none
    purpose: WS5 auth architecture & decisions (design only, no code)
    dependencies: []
    prompt: |
      DESIGN ONLY. Write NEW markdown under docs/auth/ (create the dir). Write NO code and edit NO
      existing file. English. This is the WS5 planning artifact for a later Maestro cycle.
      Today the app is 100% client-side static (no backend); auth + progress sync + leaderboard force
      a backend/BaaS and change the deployment model — say so explicitly.
      Produce (split into small files, e.g. docs/auth/00-decision.md, 10-schema.md, 20-oauth.md,
      30-compliance.md, 40-anti-cheat.md):
      1. BaaS DECISION: evaluate Supabase vs Clerk vs Firebase vs NextAuth+DB across auth, DB,
         leaderboard queries, RLS/row security, free tier, fit with a Next.js static/edge frontend,
         vendor lock-in, GDPR/KVKK posture. LEAD RECOMMENDATION: Supabase (Postgres + auth + RLS in one).
         Give a decision table + the one-line rationale + what would flip the choice.
      2. Sign-in / sign-up + Google OAuth flow; session/cookie strategy (httpOnly, SameSite, expiry,
         refresh); how a static/edge Next.js frontend holds the session.
      3. Data model: users, per-user job progress/scores, leaderboard (aggregate scores + ranks).
         Give tables/columns/keys/indexes + RLS policy sketch (users read own rows; leaderboard reads aggregate).
      4. Cookie policy + GDPR/KVKK: consent banner requirements, data classification (PII), lawful
         basis, right-to-erasure flow, retention — triggered now that we set cookies/store PII.
      5. Leaderboard ANTI-CHEAT: scores must be computed/validated SERVER-SIDE, never trusted from the
         client. Specify the server-validation model (replay the winning payload against the seeded DB
         server-side? signed score tokens? rate limits?) and its trade-offs.
      End with an OPEN-DECISIONS list for the WS5 planning cycle. This is a decision brief, not a build spec.
    accept_criteria: >
      docs/auth/*.md created with all five sections; BaaS decision has a comparison table + Supabase
      lead + flip-conditions; schema has tables/keys/indexes + RLS sketch; anti-cheat is server-side;
      GDPR/KVKK consent + erasure covered; NO code and no non-docs/auth file touched.
```

## PARENT GATE — after Wave 1 (contract-freeze gate)

Run in this order (read-only git is fine unsupervised; **commits need user approval per global rules**):
1. **Commit architect docs first** (they are uncommitted in <MAIN>, disjoint):
   `git add docs/auth && git commit -m "docs(auth): ws5 architecture & baas decision brief"`
2. **Merge the two worktrees** (disjoint zones → clean, no conflicts expected):
   `git merge --no-edit <kraken-commit>` then `git merge --no-edit <frontend-dev-commit>`
   (recover per worktree-handoff.md if a HANDOFF block is missing.)
3. **Full QA on merged <MAIN>:** `npm run typecheck && npm run test && npm run lint && npm run build && npm run test:e2e`.
   - **BUILD_FAIL/TYPE_FAIL →** dispatch `build-error-resolver` (Z of the failing file), re-run only that gate.
   - **TEST/E2E_FAIL →** feedback to the owning implementer (kraken or frontend-dev), retry ≤3, then escalate (§replan).
4. **QA review:** dispatch `code-reviewer` on the merged diff; dispatch `verifier` (final gate: build+test+lint).
   - Engine injection/XSS surface changed → also dispatch `security-reviewer` on the Z-engine diff.
5. Suite must show **108 existing + new engine tests + 3 E2E all green** before Wave 2.
6. **replan_checkpoint R1:** re-invoke maestro if (a) kraken's final secureCode/win-condition shape differs from what §Wave-2 assumes, (b) audits surfaced scope beyond Z-ui-game, or (c) the WS1 Share link-vs-card decision needs the user. Inline the audit findings + kraken's exported types into Wave-2 prompts.

---

# WAVE 2 — content + in-game UX against the FROZEN merged contract (parallel_group 2)

Two implementers, disjoint zones (`content/levels/*` vs `features/game/*`), both importing the now-frozen `lib/`.

```yaml
wave_2:
  parallel_group: 2

  - subagent_type: backend-dev
    zone: Z-content (content/levels/*.json — existing 3 migrated + new WS3 levels)
    isolation: worktree
    purpose: WS2 30 secure snippets + WS3 new-technique level JSONs, against frozen schema
    dependencies: [kraken (frozen lib/schema/level.ts)]
    prompt: |
      [PASTE WORKTREE BOILERPLATE — §2 of docs/parallel-impl-directive.md]
      You OWN Z-content only: content/levels/*.json. NEVER edit lib/, features/, app/. Import/validate
      via the FROZEN schema (lib/schema/level.ts: parseLevel, secureSnippetSchema, winConditionSchema,
      inputFilter). Read it first: sh -c 'cd <WT> && sed -n "1,200p" lib/schema/level.ts'. Every level
      you write/edit MUST pass parseLevel and the golden tests. English only, including all JSON strings.

      A) WS2 — secure-code array (3 jobs × 10 stacks = 30 snippets). For each of front-door.json,
         vault.json, blueprint.json: convert debrief.secureCode from the legacy {language,code} object
         to a SecureSnippet[] array with one entry per stack below. Keep one sensible default first.
         The vulnerable query for that job is the parameterization target — bind, NEVER concatenate.
         Each snippet must use REAL parameter binding idiomatic to that stack (a wrong "secure" example
         is a CRITICAL content defect → security-reviewer sign-off at the gate):
           1. node      — Node.js: pg ($1) / mysql2 (?)  (label "Node.js (pg / mysql2)")
           2. python    — Python: sqlite3 / psycopg2 DB-API params (? / %s)
           3. php-pdo   — PHP: PDO prepared statements (named/positional)
           4. java-jdbc — Java: JDBC PreparedStatement (setString)
           5. dotnet    — C#/.NET: ADO.NET SqlParameter / EF Core parameterized
           6. go        — Go: database/sql placeholders ($1 / ?)
           7. rails     — Ruby on Rails: ActiveRecord (where with bind / sanitized conditions)
           8. laravel   — Laravel: Query Builder / Eloquent bindings
           9. django    — Django: ORM filter / .raw with params
          10. spring    — Spring Boot: JdbcTemplate (?, args) / JPA parameter binding
         Use id = the slug above, label = human name, language = the snippet's language. Keep snippets
         SHORT and correct (the exact same defense the vulnerableCode illustrates, generalized per stack).
         Do NOT weaken any existing field; explanation/vulnerableCode/takeaway stay as-is.

      B) WS3 — new level JSONs for the new techniques. Create ONE new level per technique the engine now
         supports (error-based, blind-boolean, blind-timing, stacked-queries, waf-bypass), each a complete
         data-driven Level (schema/seed/visibleSchema/template/winCondition/hints/expectedSolution/debrief
         with the secureCode array). Use the NEW win-condition types kraken added, and the inputFilter field
         for the waf-bypass level. Names/loot in the established noir style (Meridian world, The Fixer voice;
         briefs telegraph via building metaphor, never name the technique). Each new level's expectedSolution
         must WIN and a benign input must NOT win — you will add a golden test per new level (mirror
         tests/levels/*.golden.test.ts). NOTE: tests/ is shared; add ONLY new golden files
         (tests/levels/<new-id>.golden.test.ts), do not edit existing test files or lib/.

      Register new levels wherever the existing 3 are enumerated for content loading IF that registry
      lives in content/ or features/game/levels.ts — if it lives in features/ (Z-ui-game), DO NOT edit it;
      instead list the new level ids in your HANDOFF so the parent wires them (or Z-ui-game does).
      [RUN VERIFY (tsc + vitest incl. new goldens + lint; build optional) + COMMIT + HANDOFF.
       Commit: "feat(content): per-stack secure snippets + new technique levels".]
    accept_criteria: >
      All 3 MVP levels carry a 10-entry secureCode array (30 total) that parseLevel accepts; every
      snippet uses real parameter binding for its stack; each new WS3 level parses, is solvable
      (expectedSolution wins, benign loses) and has a new golden test; existing 3 goldens still green;
      lib/features/app untouched; new level ids reported in HANDOFF.

  - subagent_type: frontend-dev
    zone: Z-ui-game (features/game/*)
    isolation: worktree
    purpose: WS0 UI fixes + WS1 in-game UX + WS2 tabbed debrief + WS3 notebook & badges
    dependencies: [kraken (normalizeSecureCode, visibleSchema copy-on-read, new win types), Wave-1 audit findings]
    prompt: |
      [PASTE WORKTREE BOILERPLATE — §2 of docs/parallel-impl-directive.md]
      You OWN Z-ui-game only: features/game/*. NEVER edit lib/, content/, app/. Import the frozen engine
      (lib/engine/*, lib/schema/level.ts — including normalizeSecureCode). The parent will INLINE the
      Wave-1 audit findings (a11y-expert, code-reviewer, web-perf-expert) into this prompt — apply the
      criticals/highs. English only.

      Deliver:
      1. WS0 audit UI fixes: apply the inlined a11y (color-law/keyboard/focus/contrast/44px/aria),
         code-review (boundaries, dead code, XSS-text-only), and low-risk perf fixes — all within features/game/*.
      2. WS1 in-game UX:
         - Back navigation that PRESERVES the engine session: let the player revisit earlier phases
           (esp. Recon from Exploit) and a "back to The Board" control WITHOUT resetting/rebuilding the
           LevelSession (do not call reset()/openLevel() on back — only on explicit replay). This lives in
           the phase machine + JobPlayer (features/game/lib/phaseMachine.ts, components/JobPlayer.tsx).
         - Exploit-screen context: show the objective + a COLLAPSIBLE recon recap (target appName +
           visibleSchema) on the Exploit screen so the player never loses "what am I doing / what did I see."
           Read session.visibleSchema (now copy-on-read; safe to hold).
      3. WS2 tabbed DebriefPanel: render debrief.secureCode via normalizeSecureCode(level.debrief.secureCode)
         → SecureSnippet[]. Update DebriefPanel.tsx + CodeCompare.tsx so beat ③ shows per-stack TABS (one
         default expanded), vulnerable ↔ secure per selected tab. Handle BOTH legacy (1 tab) and array (N tabs)
         so merge order with Z-content does not matter. Tabs must be keyboard-navigable (role="tablist"/tab/tabpanel,
         arrow keys, aria-selected). Add a local test fixture (a synthetic multi-stack level) for tab rendering —
         do NOT import lib/engine/__fixtures__ shape assumptions beyond the public type.
      4. WS3 recon notebook + badges:
         - Recon notebook: auto-collect tables/columns the player discovers across a job (observe
           ExecutionResult.columns + visibleSchema); persist in client/game state (features/game/lib).
         - Badges/achievements: per-technique mastery, driven by level.technique (now includes the new
           WS3 techniques). Client-side state; a11y-labeled.
      Keep raw input rendered as TEXT (no dangerouslySetInnerHTML). Keep files 200-400 lines where feasible.
      [RUN VERIFY (tsc + vitest + lint + build) + COMMIT + HANDOFF.
       Commit: "feat(game): audit fixes, session-preserving back-nav, exploit recon recap, tabbed debrief, recon notebook, badges".]
    accept_criteria: >
      Back nav revisits Recon from Exploit WITHOUT rebuilding the session (assert reset()/openLevel not
      called on back); Exploit shows objective + collapsible recon recap; DebriefPanel renders per-stack
      tabs from normalizeSecureCode (legacy 1-tab + array N-tab both work, keyboard-navigable); recon
      notebook accrues discovered schema; per-technique badges; inlined critical/high audit fixes applied;
      tsc+test+lint+build green; lib/content/app untouched; WORKTREE HANDOFF printed.
```

## PARENT GATE — after Wave 2 (integration gate)

1. **Merge both worktrees** (`content/levels/*` vs `features/game/*` are disjoint → clean):
   `git merge --no-edit <backend-dev-commit>` then `git merge --no-edit <frontend-dev-commit>`.
2. **Wire new levels** if the level registry is in features/game/levels.ts (Z-ui-game) — confirm the new
   WS3 level ids from backend-dev's HANDOFF are registered; if not, dispatch `spark` (Z-ui-game) to add them.
3. **Full suite + build + E2E:** `npm run typecheck && npm run test && npm run lint && npm run build && npm run test:e2e`.
4. **CONTENT-SAFETY sign-off (blocking):** dispatch `security-reviewer` on the 30 WS2 snippets + new-level
   payloads — every "secure" snippet MUST use real parameter binding for its stack; any wrong example is a
   CRITICAL defect → route back to backend-dev (fix → re-review), retry ≤3, then escalate.
5. **QA:** dispatch `arbiter` (golden/payload tests incl. new levels) + `code-reviewer` (merged diff) + `verifier` (final gate).
   Event routing: BUILD/TYPE_FAIL → build-error-resolver; TEST_FAIL(logic) → owning implementer with feedback.
6. Gate passes only when **all unit/golden (existing + new) + 3 E2E green**, build emits `out/`, and
   security-reviewer signs off the snippets.
7. **replan_checkpoint R2:** re-invoke maestro to confirm the string surface is now FINAL (WS1+WS2+WS3 UI
   merged) before starting i18n, and to resolve any tab/notebook/badge design conflicts.

---

# WAVE 3 — i18n (WS4) — SERIAL, LAST (parallel_group 3, sequential deps)

i18n wraps the NOW-FINAL string surface across app/* + features/game/* + narrative, so it must run last
and its sub-steps are sequential (framework → translate → UX-verify). Code/identifiers stay ENGLISH; only
DISPLAY strings are localized.

```yaml
wave_3:
  parallel_group: 3   # serial: 3a -> 3b -> 3c

  - subagent_type: i18n-expert
    step: 3a
    zone: cross-cutting (i18n framework, message catalogs, wire the WS1 switcher) — SERIAL, sole writer this step
    isolation: worktree
    purpose: WS4 framework + message extraction + en base catalog + locale routing/switcher
    dependencies: [Wave-2 merged (final string surface)]
    prompt: |
      [PASTE WORKTREE BOILERPLATE — §2 of docs/parallel-impl-directive.md]
      Install and configure an i18n framework for Next.js App Router static export — prefer next-intl
      (fall back to react-i18next if static export forces it); en/tr/pl are all LTR (no RTL). Steps:
      1. Add the framework + a messages/ catalog dir (messages/en.json etc.). Wire locale routing and
         connect the switcher to the WS1 navbar PLACEHOLDER (app/components/Navbar) so it becomes real.
      2. EXTRACT every user-facing DISPLAY string from app/* and features/game/* (and narrative copy in
         features/game/lib/narrative) into messages/en.json with stable keys. Replace literals with the
         framework's t()/getTranslations calls. Do NOT touch identifiers, code comments, level-JSON keys,
         or engine strings — only human-visible display text.
      3. Create messages/tr.json and messages/pl.json as en-cloned STUBS (values = English placeholders,
         clearly marked) for step 3b to translate.
      4. Ensure `npm run build` succeeds for the default locale under static export; document how per-locale
         builds/exports work.
      This step is the SOLE writer in Wave 3 — subsequent steps only fill translations/polish.
      [RUN VERIFY (tsc + vitest + lint + build) + COMMIT + HANDOFF. Commit: "feat(i18n): next-intl setup + string extraction + en catalog".]
    accept_criteria: >
      Framework wired to the navbar switcher; NO hardcoded user-facing display strings remain in app/ or
      features/game/ (grep spot-check); messages/en.json complete; tr/pl stubs exist; build green for
      default locale; identifiers/comments/level-JSON untouched; WORKTREE HANDOFF printed.

  - subagent_type: copywriter
    step: 3b
    zone: content (messages/tr.json, messages/pl.json — translations only)
    isolation: worktree
    purpose: WS4 tr + pl translations preserving The Fixer's noir voice
    dependencies: [i18n-expert (en catalog + stubs)]
    prompt: |
      [PASTE WORKTREE BOILERPLATE — §2 of docs/parallel-impl-directive.md]
      Translate messages/tr.json and messages/pl.json from the finalized messages/en.json (branch off the
      i18n-merged main). Preserve voice, don't translate literally: The Fixer's noir street-slang is
      idiomatic — keep the tone/register, not word-for-word. Keep placeholders/ICU vars/keys IDENTICAL to
      en; translate VALUES only. Do NOT touch code, identifiers, or level-JSON. TR quality: high (native
      review available). PL quality: flag for review — mark any low-confidence PL strings with a trailing
      "  <!-- PL-REVIEW -->" note in a sidecar list in your final message (not in the JSON) so the parent
      can route them. English stays the source of truth for keys.
      [RUN VERIFY (tsc + vitest + lint + build) + COMMIT + HANDOFF. Commit: "feat(i18n): tr and pl translations".]
    accept_criteria: >
      tr.json + pl.json fully populated with keys/placeholders identical to en.json; noir voice preserved
      (not literal); build green with each locale; low-confidence PL strings listed for review; only the two
      catalog files changed; WORKTREE HANDOFF printed.

  - subagent_type: babel
    step: 3c
    zone: cross-cutting locale UX polish (switcher UX, locale-aware formatting) — after 3a+3b
    isolation: worktree
    purpose: WS4 locale UX + per-locale build verification
    dependencies: [i18n-expert, copywriter]
    prompt: |
      [PASTE WORKTREE BOILERPLATE — §2 of docs/parallel-impl-directive.md]
      Branch off the translations-merged main. Polish locale UX: switcher usability (persist choice,
      aria-current, accessible labels), locale-aware number/date formatting where shown, and verify NO
      hardcoded user-facing display strings slipped through (grep app/ + features/game/). Confirm each of
      en/tr/pl builds and statically exports cleanly. Do not re-translate content (copywriter owns values);
      fix wiring/formatting/UX only. Keep code/identifiers English.
      [RUN VERIFY per locale (tsc + vitest + lint + build; build each locale) + COMMIT + HANDOFF.
       Commit: "feat(i18n): locale switcher ux + per-locale build".]
    accept_criteria: >
      All 3 locales switchable and building/exporting green; switcher persists + is a11y-labeled; zero
      remaining hardcoded display strings; locale-aware formatting applied; WORKTREE HANDOFF printed.
```

## PARENT GATE — final (release-readiness)

1. Merge 3a → QA, merge 3b → QA, merge 3c → QA (serial; each after its step).
2. Full suite + build + **per-locale** static export + `npm run test:e2e` (E2E on default locale; spot-check a second locale renders).
3. Dispatch `a11y-expert` (localized UI still colorblind-safe + keyboard) + `code-reviewer` (i18n diff) + `verifier` (final gate).
4. **replan_checkpoint R3 (OPEN DECISION — user):** PL translation-quality owner is unresolved. Surface the
   PL-REVIEW list to the user and decide the source/quality owner before treating PL as production-ready.
5. On green: commit each merge (user-approved), and the roadmap WS0–WS4 is shipped; WS5 (auth) proceeds as
   its own Maestro cycle from docs/auth/*.

---

## Parent execution contract (recap)

1. Iterate waves in order; **no wave starts until the prior PARENT GATE passes** (suite green: 108 existing
   unit/golden + all new + 3 E2E).
2. Within a wave, dispatch every agent sharing a `parallel_group` **in a single message with multiple
   `Agent` blocks** (true parallelism). Wave 3 sub-steps are serial (3a→3b→3c).
3. Pre-create each worktree (`git worktree add -b <branch> <path> HEAD`) and inline the boilerplate (§2)
   into each worktree agent's prompt. For Wave-2 frontend-dev, ALSO inline the Wave-1 audit findings.
4. After each worktree agent, read its `## WORKTREE HANDOFF`; merge with `git merge --no-edit <hash>`
   (recover stranded work per worktree-handoff.md if the block is missing). Never `git worktree prune/remove
   --force` before the commit is on main.
5. Validate each agent against `accept_criteria`. On FAIL: feedback + retry ≤3, then escalate:
   engine/type/build → build-error-resolver; small UI/content fix → spark; too-large Z-engine → decompose
   into SERIAL sub-tasks (WS0-fixes / WS2-schema / WS3-engine) since all are lib/.
6. **Git commands (commit/merge/push) need explicit user approval each time** (global rule).
7. Re-invoke maestro at **replan_checkpoints R1/R2/R3** for synthesis, conflict resolution, and the two
   OPEN DECISIONS (WS1 Share card, WS4 PL owner). On completion, re-invoke maestro to store the workflow learning.

## replan_checkpoints
- **R1 (post-Wave-1):** confirm frozen contract shape matches Wave-2 assumptions; inline audit findings; WS1 Share decision.
- **R2 (post-Wave-2):** confirm final string surface before i18n; resolve UI conflicts.
- **R3 (final):** WS4 PL translation-quality owner (user decision); release sign-off.
