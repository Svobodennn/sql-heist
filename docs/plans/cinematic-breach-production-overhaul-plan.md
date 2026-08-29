# Cinematic Breach Production Overhaul Plan

Status: implementation and verification complete; delivery mutations pending explicit approval
Date: 2026-08-29
Design source: `design-previews/sql-heist-site/cinematic-breach/`
Auth handoff: `thoughts/shared/handoffs/general/2026-08-26_17-23_supabase-accounts-complete.yaml`
Completion evidence: `docs/plans/completions/2026-08-29-cinematic-breach-production-overhaul.md`

## Goal

Integrate the approved Cinematic Breach visual direction into the real Next.js application across the home page, case board, complete case flow, auth/account/profile/leaderboard surfaces, and static content routes without changing the engine, schema, Supabase security boundary, progress semantics, localization behavior, or anonymous play.

The result must retain the mechanics that make SQL Heist instructional:

- A player's input remains visibly connected to the composed SQL.
- The database result and extracted data remain visible.
- Evidence obtained from one objective remains useful in the next objective.
- Neo/fixer guidance remains attached to the result that produced it.
- Case closure still teaches the flaw through per-objective Vulnerable and Secure code comparisons.
- A current-session debrief shows the player's actual winning payload; a cold revisit uses the authored canonical fallback.

## Verified starting state

- A fresh fetch on 2026-08-28 resolved `origin/main` to `0a14215`.
- `origin/main` contains merge commit `6d6d504` for PR #1 (`auth-accounts`) plus the OAuth mark follow-up `0a14215`.
- `cinematic-breach-theme` was created directly from `origin/main` at `0a14215` after the user's previously granted main-based branch approval.
- The worktree contains untracked design assets, preview tests, `.superdesign/`, and the auth handoff. They belong to the theme/design sessions and must not be deleted, stashed, or folded into an auth-only commit.
- The production app is a Next.js static export (`output: 'export'`).
- `AuthProvider` and `UsernameGate` wrap the shared application chrome; env-less auth remains a supported pass-through state.
- A winning objective commits its database snapshot before the next objective, records local progress, optionally pushes authenticated progress, and retains the exact winning inputs for the debrief.
- `CaseClosed` currently prefers the player's current-session inputs and falls back to `expectedSolution.inputs` when those inputs are unavailable.

## Required invariants

### Auth and account

- Do not change `features/auth/authClient.ts`, `features/auth/validation.ts`, Supabase query/RPC code, migrations, or RLS behavior for visual reasons.
- Signup username metadata must continue to auto-claim the profile; `UsernameGate` remains fallback-only.
- Country must not return in UI, types, exports, consent, or public data.
- Do not reintroduce a personal controller name into visible legal/consent copy.
- Strong-password behavior and error codes remain unchanged.
- Account deletion remains the existing reauthentication plus soft-lock request flow.

### Game and progress

- Do not modify `lib/engine/**` or `lib/schema/**`.
- Do not change query composition, SQL execution, win evaluation, case snapshots, or scoring.
- Anonymous localStorage progress remains the gameplay baseline.
- Authenticated progress merge remains monotonic, associative, and idempotent.
- Gameplay never waits on a progress network write.
- The case flow remains `briefing -> playing -> payoff -> closed`.
- Result tables, signals, recon notebook state, objective payoff, and debrief data must come from the existing runtime state rather than decorative demo data.

### Platform, i18n, and accessibility

- Static export must remain fully functional.
- Normal and Supabase-env-less builds must remain functional.
- EN/TR/PL routes and localized navigation must remain intact.
- Body text remains readable at 320 px; no global horizontal overflow.
- Keyboard navigation, focus return/trapping, live regions, and semantic tables remain intact.
- Motion and custom cursor enhancements must disable under reduced motion where appropriate.
- Text inputs, textareas, selects, and contenteditable surfaces retain a native text cursor.
- Forced-colors and coarse-pointer environments must not receive the custom cursor.

## Approved visual constraints

- Cinematic Breach is the visual source of truth; integrate it into existing React components instead of copying prototype-only HTML behavior.
- The existing navbar information architecture and controls remain. Add only the approved `SYSTEM: ONLINE` status treatment.
- The existing footer structure and content remain unchanged.
- Footer visuals remain unchanged too: new global tokens must either preserve every token the footer consumes or be scoped below a Cinematic Breach page/shell boundary so they cannot reskin the footer indirectly.
- The site-wide cursor is a magnetic ring plus dot. Elastic deformation is excluded.
- Scroll reveals are soft, one-shot, transform/opacity-based, and focus-safe.
- SQL keeps semantic coloring: keyword, string, number, injected span, and inert comment tail.
- Attack, defense, agency, and information colors retain their stable semantic meanings.
- The approved case artwork is used for the corresponding cases and never substitutes for gameplay data.

## Branch strategy

Implementation branch: `cinematic-breach-theme`, created from the freshly fetched `origin/main` at `0a14215`.

Rationale: auth/account work is now merged into main, so the branch includes the final reviewed auth surfaces and the follow-up OAuth mark without replaying or merging the old auth branch.

The branch creation was the only git mutation covered by the existing approval. Commit, push, merge, reset, rebase, stash, clean, checkout/switch, and PR mutations still require a fresh action-specific approval.

### Phase isolation and rollback

- Keep each phase as an inspectable diff slice and run its listed gate before beginning the next phase.
- Do not mix preview-only files, auth behavior changes, documentation reconciliation, or unrelated cleanup into theme implementation slices.
- Record the last green command evidence and changed-file inventory at every phase boundary.
- If a phase fails, repair or narrow that phase in the working tree; do not rewrite history or discard user work.
- If the user later approves commits, use one focused commit per completed phase. Any revert, reset, checkout, or other rollback remains separately approval-gated.

## Architecture

### Shared visual foundation

- Keep primitive, semantic, and component tokens in `app/globals.css`.
- Components consume semantic/component tokens; they do not depend directly on one-off prototype colors.
- Keep global effects in small client components mounted by `app/layout.tsx`.
- Keep cursor math pure and independently testable.
- Keep reveal observation separate from cursor behavior.
- Preserve Server Components for static content and home content where no client state is needed.

### Application behavior boundary

- Existing components continue owning behavior and data.
- Theme integration may add semantic wrappers, class names, `data-*` styling hooks, and presentational props.
- Theme code must not recreate engine or auth state in a parallel visual model.
- Case-closed receipt data is threaded from the existing per-objective UI state; it is not recomputed with a second engine.
- When current-session result evidence is unavailable, the UI states that honestly instead of fabricating output.

### Winning-run receipt contract

The current session keeps one immutable receipt for the first winning run of each objective:

```ts
interface ObjectiveReceipt {
  readonly inputs: Readonly<Record<string, string>>
  readonly composed: ComposedQuery
  readonly result: RunResult
  readonly signal: RunSignal
}
```

- The receipt is captured atomically from the same run after filtering/WAF behavior and win evaluation have completed.
- `receipt.composed.sql` and `receipt.result.composedSql` must describe the same executed SQL.
- Immutable copies are stored; later edits or reruns cannot mutate or replace the first winning receipt.
- Receipt keys use stable objective IDs, never array positions or localized labels.
- A cold revisit may show the authored canonical input, but it must not invent a runtime result, signal, duration, or extracted row.
- This is UI-session evidence only. It must not change persisted progress, scoring, snapshots, engine, or schema contracts.

### Rejected alternative

Rebuilding production routes from the static prototype HTML is rejected because it would duplicate routing, auth, engine, i18n, focus, and progress behavior and make the preview—not the application—the source of truth.

## Phase 0 — Branch safety and baseline

### Actions

1. Use the previously granted main-based branch approval for this branch action only.
2. Create `cinematic-breach-theme` at freshly fetched `origin/main` without touching the untracked preview work.
3. Record `git status`, branch ancestry, and the exact baseline commit.
4. Run the existing baseline gates before production edits:
   - `npm run typecheck`
   - `npm test`
   - `npm run lint`
   - `npm run build`

### Exit criteria

- The new branch contains the verified auth work.
- Preview and handoff files remain present and untracked.
- Baseline failures, if any, are reported before theme implementation starts.

## Phase 1 — Design foundation, cursor, motion, and shell

### Files

- Modify `app/globals.css`.
- Modify `app/layout.tsx` and `app/layout.module.css` only for shared visual/effect mounting.
- Modify `app/template.tsx` and `app/template.module.css` only if the existing route transition needs to share the new motion tokens.
- Create focused components under:
  - `app/components/CinematicCursor/`
  - `app/components/ScrollReveal/`
- Modify `app/components/Navbar/Navbar.tsx` and `Navbar.module.css` for `SYSTEM: ONLINE` and the approved skin.
- Modify presentation-only styles for LanguageSwitcher, ShareButton, UserMenu, CookieConsent, and UsernameGate as required by the shared shell.
- Copy approved case artwork into a production-owned directory under `public/`.
- Do not modify `Footer.tsx` or `Footer.module.css`.
- Preserve the production Anton, Space Grotesk, Geist, and Geist Mono stack; do not copy the preview's Inter declarations.
- Add the minimum EN/TR/PL message key only if the online status is localized rather than intentionally in-world English.

### TDD

- Pure cursor follow and magnetic-bound calculations do not mutate inputs.
- Production cursor tests import the production cursor math/component module, never the preview script.
- Cursor mounts only for fine-pointer, hover-capable, non-forced-color, non-reduced-motion environments.
- Cursor cleanup removes listeners, animation frames, and document classes.
- Text controls keep native cursor behavior.
- Reveal observer reveals focused content immediately and disconnects cleanly.
- Reveal registration remounts or re-scans on client navigation (prefer the existing `app/template.tsx` route remount boundary) so later routes never remain hidden.
- Navbar preserves every existing destination and auth entry state while adding the status indicator.

### Exit criteria

- Shared theme tokens render without changing application behavior.
- Cursor and reveal effects degrade safely.
- Navbar remains keyboard- and screen-reader-operable.
- Footer remains structurally untouched.
- Phase-specific tests, typecheck, lint, and build pass.

## Phase 2 — Home page and Case Board

### Files

- Modify `app/HomeBody.tsx` and `app/page.module.css`.
- Modify presentation in:
  - `features/game/components/CaseBoard/`
  - `features/game/components/CaseCard/`
  - `features/game/components/CaseBadgeStrip/`
- Add stable case-id styling hooks instead of deriving behavior from visible text.

### Requirements

- Preserve Server Component rendering and static JSON-LD on the home page.
- Preserve all localized home copy, CTA targets, FAQ semantics, and marquee accessibility behavior.
- Keep case progress sourced from `useCaseProgress`.
- Keep case card states and accessible progressbar values unchanged.
- Use the three approved case images with responsive crops and non-essential decorative semantics.

### TDD

- Home CTAs retain locale-aware destinations.
- Case cards retain their actual progress state and accessible labels.
- Every case maps to the correct production asset without inline remote URLs.

### Exit criteria

- Home and Case Board match the approved direction at 320, 375, 768, and 1440 px.
- No localized route or progress behavior regresses.
- Phase-specific tests, typecheck, lint, and build pass.

## Phase 3 — Complete case flow and learning mechanics

### Files

- Modify presentation/structure in:
  - `features/game/components/CasePlayer/CasePlayer.tsx`
  - `features/game/components/CasePlayer/ObjectiveConsole.tsx`
  - `features/game/components/CasePlayer/CaseClosed.tsx`
  - `features/game/components/CasePlayer/CasePlayer.module.css`
  - `features/game/components/BriefingGate/`
  - `features/game/components/ObjectivesProgress/`
  - `features/game/components/ObjectiveBanner/`
  - `features/game/components/ObjectivePayoff/`
  - `features/game/components/ReconNotebook/`
  - `features/game/components/BrowserChrome/`
  - `features/game/components/MimicSurface/`
  - `features/game/components/SignalPanel/`
  - `features/game/components/ResultGrid/`
  - `features/game/components/SqlPreview/`
  - `features/game/components/CodeCompare/`
  - `features/game/components/HintTray/`
- Add a small presentational receipt/view-model helper under `features/game/components/CasePlayer/` only if it prevents `CasePlayer.tsx` or `CaseClosed.tsx` from acquiring mixed responsibilities.

### Requirements

- Briefing, playing, payoff, and closed stages use the approved Cinematic Breach hierarchy.
- The exploit surface continues to use the real `MimicSurface`, `compose`, engine result, `SignalPanel`, and `ResultGrid` flow.
- SQL preview remains composer-segment-driven and XSS-safe.
- Objective payoff shows the actual result and Neo/fixer guidance.
- The recon notebook continues accumulating discovered values and pulled evidence across objectives.
- `CaseClosed` receives the immutable current-session `ObjectiveReceipt` keyed by objective ID:
  - the exact player input from the first winning run,
  - the exact post-filter/WAF composed SQL executed by that run,
  - that run's observed result and signal.
- Each defense review keeps its own language/framework selector immediately before Vulnerable/Secure.
- Current-session player input wins over the canonical authored solution; cold revisit fallback stays explicit.
- No demo value or preview-only SQL is introduced into production behavior.

### TDD

- Existing CaseClosed player-input and canonical-fallback tests remain green.
- Add tests for input/composed-SQL consistency.
- Add tests that `receipt.composed.sql === receipt.result.composedSql` for the winning run.
- Add tests that WAF/filter cases record the executed SQL rather than an unfiltered preview.
- Add tests that a later rerun cannot overwrite the first winning receipt.
- Add tests that current-session observed results reach the receipt keyed to the correct stable objective ID.
- Add tests for honest empty evidence on cold revisit.
- Add tests that every objective retains its own CodeCompare selector.
- Retain and extend the three-case real UI Playwright playthrough.

### Exit criteria

- All three cases remain solvable end-to-end.
- Objective data visibly feeds later objectives where the runtime supplies it.
- SQL input, composed query, observed result, payoff, and defense teaching remain connected.
- `lib/engine/**` and `lib/schema/**` have no diff.
- Phase-specific tests, full game tests, typecheck, lint, build, and case E2E pass.

## Phase 4 — Auth, account, profile, leaderboard, and static content

### Files

- Presentation-only changes under:
  - `features/auth/*/*.tsx` where semantic wrappers are necessary,
  - `features/auth/*/*.module.css`,
  - `features/profile/*/*.tsx` where semantic wrappers are necessary,
  - `features/profile/*/*.module.css`,
  - `features/leaderboard/*/*.tsx` where semantic wrappers are necessary,
  - `features/leaderboard/*/*.module.css`.
- Modify `app/auth/auth-layout.module.css`.
- Modify `app/components/ContentPage/ContentPage.tsx`, `content-blocks.tsx`, and `content.module.css` only for the approved utility-page composition.
- Preserve existing content bodies and message catalogs except for strictly visual structural labels already approved.

### Requirements

- No auth client call, validation rule, redirect, callback, focus trap, export, visibility, deletion, profile, or leaderboard query behavior changes.
- Username is not asked twice.
- Country does not return.
- Personal controller-name copy does not return.
- Loading, disabled, empty, error, success, modal, and reduced-motion states remain represented.
- Explicitly audit CaseTimer, EngineLoader, Toast, WafBanner, Button, and Stamp against the new semantic tokens; preserve their live regions, timing, and state behavior.
- FAQ remains native semantic disclosure content.
- Legal anchors, metadata, and localized routes remain intact.

### TDD

- Existing auth/account/profile/leaderboard component suites remain behaviorally unchanged.
- Add only structural/accessibility tests needed by new wrappers or labels.
- Confirm env-less auth still produces no Supabase requests or auth errors.

### Exit criteria

- Every approved production route is visually coherent with Cinematic Breach.
- Auth and profile behavior tests are unchanged or strengthened, never weakened.
- Phase-specific tests, typecheck, lint, build, and auth anonymous E2E pass.

## Phase 5 — Full verification and documentation reconciliation

### Automated gates

Normal environment, in this order:

1. `npm run typecheck`
2. `npm test`
3. `npm run lint`
4. `npm run build`
5. `npm run test:e2e`

Explicit env-less static bytes, in this order (predefined empty values prevent `.env.local` from supplying them):

1. `NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' npm run build`
2. `NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' npm run test:e2e`

Then:

- Compare the exported HTML page inventory with the pre-change baseline; no route may disappear.
- Verify env-less auth creates no Supabase request or console auth error and anonymous gameplay remains solvable.
- Run the live RLS matrix only if an auth/DB data surface changed unexpectedly; visual-only changes do not justify touching the live database.
- Compare the pre/post `out/` size and largest JS/image assets; investigate material bundle growth caused by duplicated preview code or unoptimized media.

### Browser QA

- Routes: home, cases, all three case flows, sign-in, sign-up, `/auth/callback`, account, leaderboard, public profile, help, FAQ, contact, privacy, terms.
- Viewports: 320, 375, 768, 1024, and 1440 px.
- States: anonymous, env-less, loading, error, empty, populated, modal, completed case, and cold revisit where practical.
- Verify no global horizontal overflow.
- Verify keyboard order, skip link, focus restoration, disclosure controls, dialogs, and case stage focus.
- Verify reduced motion, coarse pointer, text cursor, and forced-colors fallback.
- Verify meaningful text contrast and that attack/defense information is not color-only.
- Capture production screenshots at agreed desktop/mobile breakpoints and compare them with the approved Cinematic Breach preview for hierarchy, spacing, artwork crop, and readable code—not pixel identity.
- Include dedicated 320 px Turkish and Polish expansion smokes on nav, auth/account controls, case cards, objective receipts, debrief selectors, and legal headings.

### Documentation

- Reconcile the stale implementation status and checkboxes in `docs/auth-plan.md` after the theme is green.
- Do not alter the account deletion runbook behavior.
- Create a phase completion note under `docs/plans/completions/` after each completed phase if implementation spans multiple sessions.

## Acceptance criteria

- Cinematic Breach is implemented in the real app, not only the preview.
- Every production route listed above has a coherent responsive design.
- The original navbar behavior remains, with the approved online status added.
- The footer structure and content remain unchanged.
- Magnetic ring-plus-dot cursor works only in eligible environments; elastic behavior is absent.
- Soft reveal motion is one-shot, focus-safe, and reduced-motion-safe.
- The full case mechanic remains intact and visible from input through debrief.
- Real player inputs, composed SQL, results, carried evidence, Neo/fixer guidance, and Vulnerable/Secure instruction remain connected.
- Anonymous and env-less gameplay remain fully functional.
- Auth/RLS/progress contracts remain unchanged.
- Country and personal controller-name UI do not return.
- `lib/engine/**` and `lib/schema/**` remain untouched.
- All automated and browser gates pass with evidence.
- Theme files are kept separate from unrelated auth-only or preview-only commit scopes.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Theme starts from stale pre-merge state | Fresh-fetch and branch directly from the post-auth `origin/main` |
| Prototype HTML replaces real game/auth state | Integrate only visual hierarchy into existing components |
| Large CSS churn obscures behavior regressions | TDD first, phase gates, and component-scoped modules |
| Cursor harms text entry or accessibility | Eligibility media queries, native text cursor, cleanup tests, reduced-motion/forced-colors fallback |
| Reveal animation hides keyboard-focused content | Focus-triggered immediate reveal and reduced-motion baseline |
| Case receipts mix input, preview SQL, and a different run's result | Capture an immutable atomic receipt from the first winning run, keyed by objective ID |
| Case debrief fabricates results after a cold revisit | Show current-session results only; use canonical input fallback honestly |
| Auth visual work changes security behavior | Freeze auth client/query/RPC/migrations and rerun behavior suites |
| Preview work leaks into auth history | Explicit file scopes and status inspection before every approved commit |

## Resolved decision

The user approved a main-based theme branch. After auth PR #1 merged and `origin/main` was freshly fetched, `cinematic-breach-theme` was created at `0a14215`. No further git mutation is implied by that approval.
