# WS3 — v1 Content: Act II (new techniques) — Design Pass

> Generated: 2026-07-30. Locked decisions from the maker. The engine already carries
> the technique enums + win-condition types + `inputFilter` (kraken, WS3-spine). This
> doc defines HOW the new techniques play + the engine→UI **signal contract** to build.

## Locked decisions
1. **Error-based = honest-illustrative.** SQLite doesn't leak data through errors like MySQL. We teach the *concept* ("an error message can reveal structure") with an honest scenario — the forced error exposes a table/column name — and say so. Technique stays in.
2. **Blind = proof-of-concept scope.** Run the oracle + extract a few decisive bits, NOT tedious full char-by-char extraction (that's a script's job). Win when the player demonstrably reads the oracle / pins the target bit(s).
3. **Campaign = Act II.** Five new jobs form an "advanced" second act on top of the three MVP jobs; The Fixer hands out harder work. Board shows Act I / Act II.
4. **WAF feedback = both.** Show reject ("⛔ blocked: UNION") AND strip ("cleaned → your query became …"), per the level's `inputFilter.mode`.

## The five Act II jobs (one per technique)
| # | Job (working title) | Technique | Win signal | Loot / goal |
|---|---|---|---|---|
| 4 | The Tell | `blind-boolean` | TRUE/FALSE oracle (no rows) | confirm a hidden fact bit-by-bit (a few bits) |
| 5 | The Stopwatch | `blind-timing` | modeled slow/fast delay | same idea, timing oracle |
| 6 | The Confession | `error-based` | a forced error that reveals structure | read a leaked table/column from the error |
| 7 | The Double Tap | `stacked-queries` | a second `;` statement's side effect | cause + observe a state change |
| 8 | The Doorman | `waf-bypass` | a payload that survives the input filter | bypass a keyword blocklist to still exploit |

Ordering/titles are proposals; copywriter finalizes in the noir voice (Meridian world, The Fixer).

## Engine → UI **Signal contract** (the spine to build)
The Exploit screen ("THE WIRE") today only renders a row grid. Act II needs a
**technique-adaptive signal**. Add a PURE derivation the UI calls per run — it must not
change how exec/compose/evaluate work, only expose what already happens:

```ts
// lib/engine — pure, additive. Derived from the composed query + execution result +
// the level's technique/winCondition/inputFilter. No new side effects.
type RunSignal =
  | { kind: 'rows';        columns: string[]; rows: SqlCell[][] }        // classic/union/auth
  | { kind: 'oracle';      value: boolean; basis: string }              // blind-boolean
  | { kind: 'timing';      delayMs: number; slow: boolean; threshold: number } // blind-timing (MODELED, not wall-clock)
  | { kind: 'error';       message: string; leaked?: string }           // error-based
  | { kind: 'side-effect'; statements: number; summary: string }        // stacked-queries

// Orthogonal overlay when the level has inputFilter (WAF): reports what the filter did
// to the raw input BEFORE substitution, so the UI can show reject/strip feedback.
type FilterOutcome = { mode: 'reject' | 'strip'; blocked: string[]; effectiveInput?: string }

deriveSignal(level, composed, result): RunSignal
// levelSession.run(...) already applies inputFilter; surface its FilterOutcome on the run result.
```

Requirements for the engine spine:
- **oracle:** derive a boolean from the run per the level's blind-boolean winCondition (e.g. "rows present" vs "empty", or the condition the level pins). Deterministic.
- **timing:** the blind-timing model is SYMBOLIC (WASM is synchronous) — compute a modeled `delayMs` from whether the intended time-branch fired; `slow = delayMs >= threshold`. Never real elapsed time. Document the model.
- **error:** pass through `result.error`; `leaked` = the structural token the scenario intends to reveal (honest-illustrative).
- **side-effect:** from stacked execution — number of statements + a human summary of the observed change (rows affected / table gone).
- **filter:** `levelSession.run` must return the `FilterOutcome` (what the WAF blocked/stripped) alongside the normal result, so the UI shows it.
- Everything additive & back-compatible: the 3 MVP jobs (`rows`) keep working; all existing tests stay green.

## Content scope (Act II levels)
- Each level: schema/seed/visibleSchema, vulnerable `query.template`, the new `technique` + `winCondition` type, `expectedSolution`, 3-tier hints, and a debrief.
- **Debrief for Act II is TECHNIQUE-APPROPRIATE, not forced 10-stack.** The defense differs per technique (input validation, least privilege, *disable multi-statements*, "a WAF is not a fix — parameterize"). Ship a solid `vulnerableCode` + `secureCode` (+ 2-3 key stacks where it genuinely varies); the full 10-stack treatment is optional follow-up.
- WAF level carries `inputFilter { blocklist, mode }`; expectedSolution is a bypass.

## UI scope
- **Adaptive signal panel** in THE WIRE: switch render by `RunSignal.kind` — rows grid | oracle (TRUE/FALSE) | timing meter | error panel | side-effect readout — plus the WAF `FilterOutcome` banner overlay.
- **Recon notebook:** auto-collect discovered tables/columns across a job.
- **Badges:** per-technique mastery (now 8 techniques).
- Semantic Color Law + a11y preserved; oracle/timing/error never color-only.

## Build order
spine (engine `deriveSignal` + `FilterOutcome`, TDD) → then **content (5 levels)** ∥ **UI (adaptive panel + notebook + badges)** → merge → QA (arbiter golden + verifier + e2e for the new jobs).
