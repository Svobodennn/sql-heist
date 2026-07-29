# SQL Heist — Implementation Orchestration Directive
Generated: 2026-07-29
Orchestrator: maestro (advisor) → executed by parent (Hızır)
Source of truth: `docs/PLAN.md` (§2 contract, §3 jobs, §6 phases, §7 roster, §8 tests, §9 reconciliation, §10 risks); sub-plans `01-architecture` (route tree/components/engine signatures §1–3/§5), `03-security-content`, `04-frontend-ux`, `05-data-model`, `06-narrative`.

> This is a **forward-looking directive**, not an execution log. Parent reads it, dispatches `Agent()` per phase/group, commits each GREEN phase, then re-invokes maestro at marked `replan_checkpoint`s (esp. after P2∥P3 merge).

---

## Erotetic frame
- **X** = build the SQL Heist MVP from an APPROVED plan (greenfield: `main`, 0 commits, only `docs/`).
- **Q** = which agent per phase, what exact files, in what order, how validated, how to keep two parallel coders from colliding.
- **Answer** = Pipeline with one parallel fork: **P0 → P1 → {P2 ∥ P3} → P4 → P5**. Engine (P1) is the contract both forks depend on; forks run in **worktree isolation**.

## Memory applied
- `[RECALL] sql-heist-frontend-ux`: component list is 1:1 with arch §1.2; semantic color law; Geist Mono **ligatures OFF** (`--` must stay visible); `dangerouslySetInnerHTML` FORBIDDEN. → baked into P3 accept_criteria.
- `[RECALL] sql-heist-brand-voice`: in-game copy is **English**; handler = "The Fixer" (never names the technique); in-theme labels (THE WIRE / Send it / Call the Fixer / THE BOARD). → baked into P4.
- `[RECALL] no-coauthor-in-commits`: parent commits carry **no** `Co-Authored-By`/AI trailer. → parent commit note below.
- `[RECALL] prefers-proven-core-additive-systems`: keep the proven core intact; no clever twists to the engine contract. → engine follows arch §3 signatures verbatim.

## Orchestration pattern
**Hybrid Pipeline + Parallel-Swarm fork.** Rationale: hard dependency chain (scaffold → engine → data+UI → narrative → ship), but the two mid-phases (level data vs UI) touch disjoint directories, so they parallelize under worktree isolation for throughput. Each task runs the **Dev-QA loop** (implement → review → verify/arbiter → retry ≤3 → escalate).

---

## GLOBAL CONTRACT (applies to every phase)

### Canonical type map (parallel-agent-contracts — DO NOT redefine)
Types are OWNED by P1. P2/P3/P4 **import**, never recreate. Before creating any type, run `grep -rn "interface <Name>\|type <Name>" src/ lib/`.

| Type(s) | Owner file | Import from |
|---|---|---|
| `Level`, `WinCondition`, `InputField`, `VisibleTable`, `CodeSnippet`, `Hint`, `TechniqueId`, `SurfaceKind` | `lib/schema/level.ts` | `@/lib/schema/level` |
| `SqlCell`, `ComposedQuery`, `ExecutionResult`, `QueryComposer`, `SqlRunner`, `LevelSession`, `SqlEngine` | `lib/engine/*` | `@/lib/engine/...` |

### Non-negotiable canonical constraints (PLAN §9)
- **K1** — Front Door template SELECTs `is_admin`: `SELECT id, username, is_admin FROM users WHERE username='{{input:username}}' AND password='{{input:password}}'`. (`role` column DROPPED — R7.)
- **K6** — `row-match` shape is `{ expect: Array<Record<string,SqlCell>>, mode: "subset"|"exact" }`; a WIN = at least one returned row satisfies all col=val pairs of at least one `expect` entry. The "object + any" draft is INVALID.
- **K7** — raw player input renders to DOM as **TEXT** via React default escaping; `dangerouslySetInnerHTML` is a **lint-enforced ban**.
- **K8** — `#` comments are NOT taught (SQLite doesn't support); only `--` and `/* */`.
- **Injection rule (arch §3.3)** — `compose` performs RAW substitution of `{{input:field}}`; **no escape/quote/parametrization**. "Fixing" this breaks the game. `compose` is PURE; `exec` always catches SQLite errors into `.error`; `evaluate` is SEPARATE from exec.
- **Segments come from the composer** (static vs injected), never regex-guessed (needed by `<SqlPreview>`).

### Verification every code agent runs before declaring COMPLETE
```
npx tsc --noEmit 2>&1 | head -20     # zero type errors
npm test 2>&1 | tail -20             # full suite (regression = NOT done)
```

### Parent responsibilities between phases
1. Validate accept_criteria; on FAIL send targeted feedback (handoff-templates #3), retry ≤3, then escalate (assignment-matrix chain).
2. **Commit each GREEN phase** — `type(scope): desc`, lowercase, single line, **NO `Co-Authored-By`/AI trailer**, files scoped to that phase. Ask user approval per git-conventions (user is away → proceed unless super-critical).
3. For worktree phases (P2, P3): apply **worktree-handoff protocol** — read each agent's `## WORKTREE HANDOFF` block, `git merge --no-edit <hash>` into `main`; if handoff missing but files changed, recover from the worktree dir before pruning.
4. Inline upstream summaries into downstream prompts where `dependencies` are declared.

---

## PHASE DIRECTIVE

```yaml
phase_0_scaffold:
  goal: Working empty skeleton — Next.js App Router + TS + tooling + sql.js WASM served & smoke-proven.
  depends_on: []

  - subagent_type: template-engine
    parallel_group: 0a            # sequential: MUST finish before 0b (shares package.json/config)
    purpose: Scaffold the Next.js App Router + TypeScript project with lint/format/test runner and static-export config.
    dependencies: []
    prompt: |
      Greenfield scaffold for SQL Heist at repo root /Users/svoboden/development/sql-heist
      (git repo, branch main, 0 commits, only docs/ present). Base on docs/01-architecture.md
      §1.1 (route tree), §1.3 (directory layout), §7.2 (build/deploy), and docs/PLAN.md §6 (P0)
      + §12 (dependencies).
      CREATE:
        - Next.js App Router + TypeScript project (package.json, tsconfig.json, next.config.*
          with `output: 'export'` static export, `.gitignore`).
        - Tooling: ESLint + Prettier, and a **custom lint rule / config that BANS
          `dangerouslySetInnerHTML`** (K7). Vitest configured (`npm test` runs it).
        - Path alias `@/*` -> repo root (so `@/lib/...`, `@/features/...` resolve).
        - Empty route shell per arch §1.1: app/layout.tsx, app/page.tsx, app/jobs/layout.tsx,
          app/jobs/page.tsx, app/jobs/[jobId]/page.tsx (with generateStaticParams() returning
          front-door | vault | blueprint). Placeholder content is fine; NO game logic yet.
        - Empty dirs with .gitkeep: lib/engine/, lib/schema/, content/levels/, features/game/.
        - Add deps (do NOT implement usage yet): zod, sql.js (+ @types), framer-motion.
      Do NOT scaffold the WASM asset or engine — that is 0b / P1.
      Before COMPLETE run: `npx tsc --noEmit` and `npm run build` (static export must succeed).
      Report exact files created + Next.js/TS versions used.
    accept_criteria: >
      `npm run build` produces a static export with all 5 routes pre-rendered (3 [jobId] params);
      `npx tsc --noEmit` clean; ESLint config present and dangerouslySetInnerHTML ban active;
      `npm test` runs (0 tests OK). Directory skeleton matches arch §1.3.
    isolation: none

  - subagent_type: frontend-dev
    parallel_group: 0b            # after 0a
    purpose: Wire sql.js WASM as a static public/ asset and prove it loads+runs a query under static export (PLAN §10 TOP risk).
    dependencies: [template-engine]
    prompt: |
      Scaffold from 0a is in place. Base on docs/01-architecture.md §2.1 (WASM singleton/lazy
      load, locateFile) and docs/PLAN.md §10 (top risk: "sql.js WASM won't load in static export").
      DO:
        - Copy sql.js `sql-wasm.wasm` into `public/sql-wasm.wasm`.
        - Add a minimal loader `lib/engine/sqlLoader.ts` exporting an async `initSqlJs` singleton
          that uses `locateFile: () => '/sql-wasm.wasm'` (fixed path). Module-level cache so it
          loads once. This is a STUB loader (P1 kraken owns the full engine) — keep it tiny and
          replaceable; export just enough to prove WASM boots.
        - Add a smoke test (vitest, jsdom or node) that calls the loader, does
          `new SQL.Database()`, runs `db.run("CREATE TABLE t(x)"); db.exec("SELECT 1")`, asserts
          a result, then closes. This is the §10 risk gate.
        - Confirm `npm run build` (static export) still succeeds WITH the wasm asset present.
      Do NOT build queryComposer/winEvaluator/levelSession — that is P1.
      Before COMPLETE: `npx tsc --noEmit`, `npm test` (smoke passes), `npm run build`.
    accept_criteria: >
      public/sql-wasm.wasm present; smoke test loads WASM + runs a real SELECT and passes;
      static export build still green; loader uses fixed locateFile path.
    isolation: none

  qa_signoff: verifier            # PLAN §7
  replan_checkpoint: >
    PARENT: run verifier (build+lint+test). GATE = §10 top risk retired (WASM boots under static
    export). If FAIL escalate to build-error-resolver. On GREEN: commit
    `chore(scaffold): next.js app router + sql.js wasm smoke`. Do NOT start P1 until this is green.
```

```yaml
phase_1_engine:
  goal: Test-covered pure core — types, raw injection composer, sql.js loader (fresh-DB-per-level), WinEvaluator (3 DSL types + anti-trivial), scoring/hint. THIS IS THE CONTRACT P2 & P3 DEPEND ON.
  depends_on: [phase_0_scaffold]

  - subagent_type: kraken
    parallel_group: 1
    purpose: TDD-implement the full engine + Zod Level schema per the canonical arch contract.
    dependencies: [phase_0_scaffold]
    prompt: |
      Implement the SQL Heist engine with STRICT TDD (RED→GREEN→REFACTOR). Source of truth:
      docs/01-architecture.md §3.2 (contract signatures — use field/type names VERBATIM),
      §3.3 (rules), §2.2–2.3 (fresh DB per level, exec flow), §5 (win eval + anti-trivial),
      §4 (canonical Level schema); docs/PLAN.md §2 (contract), §2.3 (win DSL), §8 (test strategy),
      §9 (K1/K6/K7/K8). Replace 0b's stub loader with the real one.
      CREATE (exact files, arch §1.3):
        - lib/schema/level.ts — Zod schema for `Level` (§4) + inferred TS type; export
          `WinCondition`, `InputField`, `VisibleTable`, `CodeSnippet`, `Hint`, `TechniqueId`,
          `SurfaceKind`. Build-time/dev validation gate (invalid JSON = error).
        - lib/engine/queryComposer.ts — `compose(template, inputs): ComposedQuery`. RAW
          substitution of `{{input:field}}`, NO escaping (K-injection). PURE. MUST expose
          segment info (static vs injected) so <SqlPreview> renders engine-truth, not regex.
          Populate `unresolved` for missing tokens.
        - lib/engine/sqlRunner.ts — `exec(db, sql): ExecutionResult`. ALWAYS try/catch SQLite
          errors into `.error` (never throw); fill columns/rows/rowCount/durationMs.
        - lib/engine/winEvaluator.ts — pure `evaluate(cond, ctx): {won, reason}` for ALL THREE
          DSL types: `rows-returned {min,max?}`, `flag-in-result {flag, column?}`,
          `row-match {expect: Array<Record<string,SqlCell>>, mode:"subset"|"exact"}` (K6 exact
          semantics: subset = row may have extra cols; exact = 1:1). Anti-trivial guard (§5.3):
          empty/noise input must NOT win.
        - lib/engine/levelSession.ts + engine factory (SqlEngine.init/openLevel) — fresh
          `new SQL.Database()` per level, run schemaSql then seedSql, reset() disposes+rebuilds,
          dispose() frees WASM. run(inputs) = compose+exec (evaluate stays SEPARATE).
        - scoring/hint helper (PLAN §6 P1 scope): scoring inputs + 3-tier hint gating (pure).
      TESTS (TDD, colocated *.test.ts): compose raw-injection cases incl. K1 login bypass shape;
      exec catches a deliberate SQL error into .error; each win DSL type incl. row-match
      subset vs exact; anti-trivial (empty/gibberish → not won); levelSession reset gives a
      clean DB (destructive payload doesn't leak). Do NOT hardcode the 3 real levels here (P2
      owns content) — use fixtures.
      Type ownership: you OWN these types; export them cleanly.
      Before COMPLETE: `npx tsc --noEmit` clean, `npm test` full suite green.
    accept_criteria: >
      All engine files exist with arch-§3.2 signatures verbatim; compose does raw injection & is
      pure & exposes segments; exec never throws; WinEvaluator handles all 3 DSL types with K6
      subset/exact + anti-trivial; levelSession fresh-DB+reset+dispose proven by test; Zod Level
      schema validates. tsc clean, full suite green.
    isolation: none

  qa_signoff: [code-reviewer, security-reviewer, verifier]   # PLAN §7
  qa_prompt_notes: |
    security-reviewer FOCUS: confirm the injection path has NO accidental escaping (game must stay
    vulnerable-by-design) AND no XSS sink (no dangerouslySetInnerHTML anywhere; raw strings stay data,
    not HTML). code-reviewer: arch §3.3 rules (pure compose / catching exec / separate evaluate),
    file-size & style rules. verifier: build+test+tsc gate.
  replan_checkpoint: >
    PARENT: engine is the shared contract — it MUST be fully green before the fork. Run all 3 QA
    agents. On GREEN commit `feat(engine): level schema, injection composer, sql runner, win
    evaluator`. THEN set up two worktrees for P2 & P3. This is a hard gate.
```

```yaml
phase_2_level_data:            # PARALLEL with phase_3_ui
  goal: 3 playable level JSONs (front-door, vault, blueprint) + per-level payload golden CI tests.
  depends_on: [phase_1_engine]
  parallel_with: phase_3_ui

  - subagent_type: backend-dev
    parallel_group: 2
    purpose: Author the 3 canonical level JSONs against the engine Zod schema + golden payload tests.
    dependencies: [phase_1_engine]
    prompt: |
      Author the 3 MVP level data files. Sources: docs/PLAN.md §3 (the THREE canonical job specs —
      templates/DB/payloads/win are FROZEN there), §2.1 (Level schema fields), §4 defense debrief,
      §8 (test strategy), §9 (K1 is_admin / K6 row-match / R3 real table names / R4 UNION col
      counts / R7 no role / K8 no #). Field-level detail & seed/loot: docs/05-data-model.md.
      Debrief technical body & payloads: docs/03-security-content.md. Consult data-modeler doc for
      exact table/column/loot values — do NOT invent names.
      CREATE (pure data — engine is FROZEN, do not touch lib/):
        - content/levels/front-door.json — surface:login (username,password); template SELECTs
          `id, username, is_admin` (K1, NO role); users(id PK, username UK, password, is_admin) with
          an is_admin=1 row; win = row-match {expect:[{is_admin:1}], mode:"subset"};
          expectedSolution username `admin' -- ` (or `' OR '1'='1' -- `).
        - content/levels/vault.json — surface:search (q); template
          `SELECT id, name, price FROM products WHERE name LIKE '%{{input:q}}%'`; visible products
          + KNOWN offshore_accounts(id, holder_name, account_ref, balance_usd); UNION = 3 cols (R4);
          win = flag-in-result {flag:"LOOT-VAULT-9F2C4471"}; expectedSolution
          `' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- `.
        - content/levels/blueprint.json — surface:search (q); template
          `SELECT title, body FROM articles WHERE title LIKE '%{{input:q}}%'`; articles visible +
          HIDDEN z_bp_registry_7f3a(schematic_id, payload) NOT in visibleSchema; UNION = 2 cols (R4);
          win = flag-in-result {flag:"LOOT-BLUEPRINT-3D1F8A22"}; expectedSolution
          `' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- `.
        - Each level: schemaSql, seedSql, visibleSchema, brief (placeholder EN copy ok — P4/
          copywriter refines), debrief{explanation, vulnerableCode, secureCode, takeaway} from 03,
          hints[] (3-tier), scoring/tags optional. secureCode = parametrized version 03 verified
          reduces the SAME payload to [] rows.
        - tests/levels/*.golden.test.ts — for EACH level, load JSON via engine, run
          expectedSolution.inputs against seeded DB → assert WIN; a benign input → NOT win; run
          secureCode form → assert `[]` (PLAN §8 secure-fix test). Also invariant tests: Vault UNION
          = 3 cols (ORDER BY 3 ok / 4 errors), Blueprint = 2 cols.
      All 3 JSONs MUST pass the P1 Zod `Level` schema (import from @/lib/schema/level).
      Before COMPLETE: `npx tsc --noEmit`, `npm test` (all golden tests green).
      WORKTREE: you run in an isolated git worktree. When done you MUST commit:
        git add -A && git commit -m "feat(content): 3 mvp levels + golden payload tests"
        then print a `## WORKTREE HANDOFF` block with Branch + Commit hash.
    accept_criteria: >
      3 JSONs validate against Zod Level schema; each golden test proves expectedSolution WINS,
      benign NOT-win, secureCode → []; Vault=3col & Blueprint=2col invariants tested; loot flags
      exact (LOOT-VAULT-9F2C4471 / LOOT-BLUEPRINT-3D1F8A22); K1 is_admin projected, no role, no #.
      Worktree committed + handoff block present.
    isolation: worktree

  qa_signoff: [code-reviewer, security-reviewer, arbiter]   # PLAN §7
  qa_prompt_notes: |
    security-reviewer = payload↔fix SIGN-OFF: verify each secureCode is genuinely a parametrized/
    prepared form that neutralizes its payload (03 authority), and no "secure" example is subtly
    wrong (PLAN §10 content-safety risk). arbiter = run the payload golden CI suite. code-reviewer =
    schema conformance + no engine edits.
```

```yaml
phase_3_ui:                    # PARALLEL with phase_2_level_data
  goal: Playable UI — 5 screens + Job Board, <SqlPreview>, <CodeCompare>, mimic form-fields, noir theme.
  depends_on: [phase_1_engine]
  parallel_with: phase_2_level_data

  - subagent_type: frontend-dev
    parallel_group: 2
    purpose: Build the client component tree + noir theme, wired to the engine (not to real level content).
    dependencies: [phase_1_engine]
    prompt: |
      Build the game UI. Sources: docs/04-frontend-ux.md (5 screens, THE FRONT/THE WIRE split,
      semantic color law, <SqlPreview> layered rendering, mimic surfaces), docs/01-architecture.md
      §1.2 (component boundaries — 1:1) & §1.3 (features/game/), docs/PLAN.md §5 (UX summary), §9
      (K7 XSS). Consult designer during build for color-law/spacing QA.
      IMPORT the engine — do NOT reimplement it or touch lib/. Import `Level` & win/engine types
      from @/lib/schema/level and @/lib/engine/*. Use a fixture Level for wiring (real content
      arrives from P2 at merge; do not author level JSON).
      CREATE under features/game/ (all 'use client'):
        - <JobPlayer level> — phase state machine (useReducer: brief→recon→exploit→loot→debrief),
          engine session in useRef, dispose on unmount.
        - <BriefPanel>, <ReconPanel> (BrowserChrome + visibleSchema card), <ExploitConsole>
          (mimic form-fields per target.surface: login/search; monospace auto-grow),
          <SqlPreview>, <ResultGrid>, <LootBanner>, <DebriefPanel> (<CodeCompare> vuln↔secure),
          <HintTray> + primitives (TopBar/PhaseStepper, MimicSurface, ScoreBreakdown, JobCard,
          EngineLoader, Toast).
        - <SqlPreview>: layered coloring driven by composer SEGMENTS (static=neutral, injected=
          crimson band + break-out marker, comment tail dim+strike). MUST use engine segment data,
          NOT regex. Raw input rendered as TEXT (React escaping). `dangerouslySetInnerHTML` FORBIDDEN.
        - Fill the app/ route shells (Job Board hub with completed/active/locked JobCards; [jobId]
          page mounts <JobPlayer>).
        - Noir theme: --noir-900 #0B0D10, semantic color law (crimson=attack, jade=defense,
          brass=agency, steel=info) where COLOR ALONE never carries meaning (icon+label+position
          too — colorblind); Geist Mono with LIGATURES OFF (`--` must stay visible); Space Grotesk
          display + Geist Sans body (Inter BANNED).
      Named UX rules: 44px touch, AA contrast, <300ms transitions, z 10/50/100, 4/8px grid.
      Before COMPLETE: `npx tsc --noEmit`, `npm test`, `npm run build` (static export green).
      WORKTREE: isolated git worktree. When done commit:
        git add -A && git commit -m "feat(ui): game screens, sql preview, noir theme"
        then print `## WORKTREE HANDOFF` with Branch + Commit hash.
    accept_criteria: >
      All arch §1.2 components exist under features/game/; <SqlPreview> uses composer segments (not
      regex) and renders input as text; ZERO dangerouslySetInnerHTML (lint clean); ligatures off;
      color law with non-color redundancy; static-export build green; tsc + tests pass. Worktree
      committed + handoff block present.
    isolation: worktree

  qa_signoff: [code-reviewer, a11y-expert]   # PLAN §7
  qa_prompt_notes: |
    a11y-expert = color law (color never sole signal), keyboard nav, AA contrast, focus order,
    touch targets. code-reviewer = component boundaries, no engine edits, K7 ban, file sizes.
  replan_checkpoint: >
    PARENT (after BOTH P2 & P3 return): apply worktree-handoff — merge each worktree commit into
    main (git merge --no-edit <hash>). Then run `npx tsc --noEmit` + full `npm test` + `npm run
    build` on the MERGED tree to catch integration drift (P3 fixture types vs P2 real JSON). If
    conflict or type drift: RE-INVOKE MAESTRO for conflict resolution. On GREEN: commit is already
    per-worktree; add an integration commit if merge needed. THIS IS THE PRIMARY REPLAN CHECKPOINT.
```

```yaml
phase_4_narrative_score_hint:
  goal: Embed 06 copy, scoring display, 3-tier hints — full loop wired with real content.
  depends_on: [phase_2_level_data, phase_3_ui]   # needs merged tree

  - subagent_type: frontend-dev
    parallel_group: 4
    purpose: Wire real level content + narrative copy + scoring UI + 3-tier hint gating into the merged app.
    dependencies: [phase_2_level_data, phase_3_ui]
    prompt: |
      The merged tree now has real level JSONs (P2) + UI components (P3). Finish the full loop.
      Sources: docs/06-narrative.md (voice/copy — The Fixer handler, Meridian mark, in-theme labels
      THE WIRE / "Send it" / "Call the Fixer" [A word/The method/The play] / THE BOARD / ranks
      Nobody→Runner→Earner→Made→Ghost), docs/PLAN.md §4 (defense debrief framing), §6 (P4 scope).
      Consult copywriter for final English microcopy (in-game language = English).
      DO:
        - Replace placeholder brief/loot/debrief framing text with 06 copy (technique NAME never
          spoiled in brief; building metaphor). Keep debrief technical body from the level JSON (03).
        - <ScoreBreakdown>/scoring display driven by the P1 scoring helper.
        - <HintTray> "Call the Fixer" 3-tier gating (A word → The method → The play) using P1 hint
          engine + level.hints.
        - Job Board rank/labels + completion state copy.
      Do NOT change engine or level payload/win data. Text + wiring only.
      Before COMPLETE: `npx tsc --noEmit`, `npm test`, `npm run build`.
    accept_criteria: >
      All 3 jobs render real narrative copy (English, The Fixer voice, no technique-name spoilers);
      scoring breakdown + 3-tier hints functional; in-theme labels present; build+tsc+tests green.
    isolation: none

  qa_signoff: code-reviewer   # PLAN §7 (+ copywriter as content QA)
  replan_checkpoint: >
    PARENT: on GREEN commit `feat(game): narrative copy, scoring, tiered hints`. Proceed to P5.
```

```yaml
phase_5_verify_deploy:
  goal: E2E each job solvable end-to-end, a11y, perf, static export → Vercel. Release-ready MVP.
  depends_on: [phase_4_narrative_score_hint]

  - subagent_type: e2e-runner
    parallel_group: 5a           # E2E first — proves the product before shipping
    purpose: End-to-end play-through of all 3 jobs (Recon → correct payload → Loot → Debrief).
    dependencies: [phase_4_narrative_score_hint]
    prompt: |
      Write & run E2E (Playwright) proving each of the 3 jobs is solvable end-to-end per
      docs/PLAN.md §8 (E2E) + §3 (the winning payloads). For EACH job: navigate Job Board →
      Brief → Recon → type the canonical winning payload in ExploitConsole → run → assert Loot
      reveal (correct flag) → Debrief shows vuln↔secure. Also assert a benign input does NOT win,
      and reset() gives a clean DB. Run against the static export build.
      Report pass/fail per job with traces on failure.
    accept_criteria: All 3 jobs pass E2E win-path; benign no-win asserted; reset verified.
    isolation: none

  - subagent_type: shipper
    parallel_group: 5b           # after 5a green
    purpose: Static export → Vercel release prep (pre-deploy checklist, smoke).
    dependencies: [e2e-runner]
    prompt: |
      Prepare release per docs/PLAN.md §6 (P5) + §12 (static export → Vercel; no runtime service).
      Verify `next build` static export output, confirm public/sql-wasm.wasm is included & served
      at /sql-wasm.wasm in the export, produce Vercel static deploy config, run a post-export smoke
      (WASM loads from the exported bundle, one job win-path). Do NOT deploy to prod without parent
      go — prepare + verify locally / preview.
    accept_criteria: Static export builds; wasm asset shipped & loadable from export; deploy config ready; smoke green.
    isolation: none

  qa_signoff: [verifier, web-perf-expert]   # PLAN §7 — verifier = FINAL GATE
  qa_prompt_notes: |
    verifier = final gate: build + full test + lint + E2E all green, no console.log, no secrets.
    web-perf-expert = lazy-load engine (landing carries no WASM), bundle size, first-load (PLAN §10
    bundle risk). K7 XSS: dangerouslySetInnerHTML absent (lint).
  replan_checkpoint: >
    PARENT: on final GREEN commit `chore(release): static export + vercel config`. Then RE-INVOKE
    MAESTRO for the retrospective report + memory store (workflow pattern learnings).
```

---

## replan_checkpoints (summary — parent returns to maestro or gates here)
| After | Gate | Maestro re-invoke? |
|---|---|---|
| P0 | WASM boots under static export (§10 top risk) | only if FAIL |
| P1 | Engine fully green (shared contract) before fork | only if FAIL |
| **P2 ∥ P3 merge** | worktree merge + integration tsc/test/build on merged tree | **YES if conflict/type-drift** |
| P4 | full loop green | only if FAIL |
| P5 | verifier final gate + perf | **YES — retrospective + memory store** |

## Escalation (assignment-matrix)
kraken(P1) stuck → decompose to spark units. frontend-dev stuck → +designer / +architect. backend-dev(P2) stuck → data-modeler + security-reviewer. build fail any phase → build-error-resolver. Any agent: retry ≤3 with targeted feedback, then escalate.

## Parallel safety note
P2 (writes `content/levels/*`, `tests/levels/*`) and P3 (writes `features/game/*`, `app/*`, styles) touch **disjoint** paths and both only READ `lib/`. Worktree isolation is belt-and-suspenders per constraint; neither writes `lib/` (engine FROZEN after P1). No same-file contention.
