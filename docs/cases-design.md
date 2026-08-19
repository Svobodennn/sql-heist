# Cases & Objectives — Design

> **Shipped (2026-08).** This is the design that landed — the phased plan (P0–P5) below is done.
> Kept as the design record; current operational authority is `CLAUDE.md`.

## Why (north star)

Today's 8 standalone jobs don't make it clear **what** the player must do, **why**, or
**how they'll know they succeeded**. This restructure fixes exactly that: content becomes
**Cases** (a themed breach of one target system) made of ordered **Objectives**, and every
screen answers *what · why · done-when* at a glance — inspired by SQL Noir's case/objective
model, kept in our heist skin.

## Locked decisions

- **Model A** — one persistent database per case. Objectives are successive goals against the
  *same* system; a write in an earlier objective is visible to a later one.
- **"Case"** stays as the name (a heist case/score).
- **Regroup** the existing 8 techniques into cases (not one-objective-per-case).

## Data model (additive; the engine win-DSL stays frozen)

A **Case** owns the shared DB + the narrative wrapper; an **Objective** is ~today's Level
minus the database, plus the clarity fields.

```
Case {
  schemaVersion, id, number ("001"), title,
  briefing { handler, text },          // what this whole case is + why it matters
  target   { appName },                // the system being breached
  database { schemaSql, seedSql, visibleSchema },   // ONE merged DB for the case
  objectives: Objective[],             // ordered
  caseClosed { headline, fixer },      // payoff after the last objective
  tags?
}

Objective {
  id, order,
  goal,        // WHAT — one imperative line: "Make the desk confirm the first PIN digit."
  why,         // WHY  — stakes: "That PIN opens the back office where the ledger lives."
  doneWhen,    // HOW YOU KNOW — player-facing success signal (in-world, not the raw DSL)
  technique,   // badge
  surface, fields,             // this step's input entry point (login box / search / code box)
  query { template, inputFilter? },
  winCondition,                // the frozen win-DSL, unchanged (incl. mustReference)
  hints, expectedSolution,
  debrief { explanation, vulnerable*/secure* variants, takeaway }
}
```

`goal / why / doneWhen` are the fix for "belirsizlik" — always authored, always on screen.

## Engine — the one real addition: a persistent case-session

- Frozen and unchanged: `queryComposer`, `sqlRunner`, `winEvaluator` (they operate on a query
  + a DB; they don't care who owns the DB).
- New `caseSession` (a persistent sibling of `levelSession`): builds ONE DB from the case's
  `schemaSql + seedSql`, then per objective composes that objective's template against the
  **shared, persisting** DB and evaluates its winCondition.
- **Snapshots** (via sql.js `db.export()/new Database(bytes)`): snapshot at each objective
  boundary. Attempts within an objective reset to that objective's start snapshot (deterministic
  retries); a win advances the snapshot so a completed write carries forward.
- Reality check: 7 of 8 techniques are read-only; only stacked-queries mutates, and it's the
  terminal objective — so persistence is mostly framing, but the snapshot model keeps it correct
  and future-proof (later objectives that build on a write).

## Regrouping (8 techniques → 3 cases, one story: breaching Meridian)

| Case | Theme | Objectives (technique) | Merged DB (no table collisions) |
|------|-------|------------------------|----------------------------------|
| **001 — The Front Door** | get in, look around, first score | auth-bypass → schema-discovery → union-extraction | users · articles · z_bp_registry · products · offshore_accounts |
| **002 — The Quiet Room** | the system barely talks | blind-boolean → blind-timing → error-based | reset_codes · vault_config · sessions · staff · promo_claims |
| **003 — The Vault** | beat the defenses, force it open | waf-bypass → stacked-queries | notices · archive_ledger · door_acl |

Difficulty escalates across cases (3 + 3 + 2 = 8). Each case's objective DBs merge cleanly
(verified: no shared table names). Every objective's `query.template` / `winCondition` /
`mustReference` port **verbatim** — only the DB is hoisted to the case and merged.

## UI

- **Case Board** (`/cases`) — numbered cards "Case 001 — The Front Door" (replaces Job Board).
- **Case page** (`/cases/[caseId]`) — briefing + an **objectives checklist** (progress) + the
  active objective's exploit surface; objectives are steps *within one page* (SQL-Noir style),
  not separate routes.
- **Objective banner** — always visible: "Objective 2/3 — <goal>" + why + done-when.
- **Recon notebook** spans the whole case (accrues discovered schema across objectives —
  already a natural fit).
- Progress in localStorage: per-objective completion within a case; case done when all pass.

## What changes vs stays

- **Stays frozen:** win-DSL + `winEvaluator`, `queryComposer`, `sqlRunner`, the recon-notebook
  and signal logic.
- **New:** `Case`/`Objective` schema, `caseSession` (persistent DB + snapshots), Case Board +
  Case page + objective banner/checklist.
- **Migrated:** 8 job JSONs → 3 case JSONs (DB merges + goal/why/doneWhen + case briefings).
- **Routes/SEO:** `/jobs` → `/cases`; port the existing SEO infra (siteConfig, per-route
  `generateMetadata`, sitemap, breadcrumbs Home›Cases›001, JsonLd). Homepage copy "eight jobs"
  → "three cases, eight objectives". Old `/jobs` optionally kept as client-redirect stubs.

## Phased plan (docs-first; each phase ends green: typecheck + test + build + e2e; scoped commit)

- **P0 — Design doc.** This file. ✔ (pending your sign-off)
- **P1 — Schema.** `lib/schema/case.ts` (Case + Objective Zod, additive; Level kept during
  migration). `parseCase` build-gate. Unit tests.
- **P2 — Engine.** `caseSession` (persistent DB + per-objective compose/run/evaluate +
  snapshots). Golden tests: every objective solvable against the shared DB; the stacked write
  persists to the next objective; retries reset to the objective snapshot.
- **P3 — Content.** Author the 3 case JSONs (merge DBs, port the 8 objectives verbatim +
  goal/why/doneWhen, case briefings + caseClosed). Golden tests mirror today's 8, now per objective.
- **P4 — UI.** Case Board + Case page + objective banner + checklist + case-spanning notebook;
  per-objective exploit loop. E2E: each case solvable end-to-end through all its objectives.
- **P5 — Wire-up.** Routes `/jobs`→`/cases`, SEO (metadata/sitemap/breadcrumbs/JsonLd) + homepage
  copy to cases, retire the old job route/registry + dead Level path once fully superseded.

## Open questions / risks

- ~~Keep `/jobs` as redirect stubs, or hard-replace?~~ **Resolved: hard-replace, no stubs.** `/jobs`
  was removed; under static export (`output: 'export'`) there is no server-side redirect, so `/jobs`
  now returns 404. Acceptable — fresh site, low external linkage; `/cases` is the only board route.
- Case-closed payoff: one screen after the last objective (vs per-objective loot moments — keep both?).
- Objective independence: an objective must be solvable from its own snapshot even if the player
  jumps around — snapshots guarantee this, but authoring must not assume out-of-order play.
