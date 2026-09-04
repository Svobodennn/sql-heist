# Cinematic Breach production overhaul — completion

Status: implementation and verification complete; delivery mutations pending explicit approval
Date: 2026-08-29
Branch: `cinematic-breach-theme`
Base: `main` / `origin/main` at `0a14215`

## Outcome

The approved Cinematic Breach direction is integrated into the production Next.js application across the home page, case board, full case flow, auth/account/profile/leaderboard surfaces, and static content routes. The implementation reuses the real application state and components; no preview-only runtime was copied into production.

The instructional chain remains intact:

- the player's first winning input is captured with the exact filtered/composed SQL, result, and signal from the same run;
- pulled evidence and the recon notebook continue across objectives;
- objective payoff remains tied to the observed result and Neo/fixer guidance;
- case closure shows `Your move`, `Composed SQL`, `Observed result`, and per-objective Vulnerable/Secure code comparisons;
- cold revisits use the authored canonical input without fabricating runtime evidence.

## Completed production scope

- Shared Cinematic Breach tokens and responsive visual shell.
- Original navbar behavior with the approved `SYSTEM: ONLINE` treatment.
- Site-wide magnetic ring-plus-dot cursor with no elastic deformation.
- One-shot, focus-safe scroll reveals with no-JS and reduced-motion visibility fallbacks.
- Home, case board, three local case artworks, briefing, live objective console, payoff, case-closed receipt, and defense teaching views.
- Presentation-only overhaul of sign-in, sign-up, callback, account, deletion dialog, public profile, leaderboard, FAQ, help, contact, privacy, and terms surfaces.
- EN/TR/PL presentation and receipt message parity.
- A 320 px Polish legal-copy overflow regression test.

## Preserved boundaries

- `lib/engine/**` and `lib/schema/**` have no diff.
- Supabase auth calls, validation, RLS/RPC behavior, migrations, and progress-merge semantics were not changed for the theme.
- Anonymous localStorage play and explicit Supabase-env-less behavior remain functional.
- `Footer.tsx` and `Footer.module.css` remain structurally untouched; browser review confirmed the original footer treatment remains.
- Country and personal controller-name UI were not reintroduced.
- Preview-only `.superdesign/`, `design-previews/`, preview tests, and `thoughts/` remain separate from production delivery scope.

## Verification evidence

Normal environment, final run:

- `npm run typecheck` — PASS.
- `npm test` — PASS, 70 files and 455/455 tests.
- `npm run lint` — PASS, zero warnings/errors.
- `npm run build` — PASS, 54/54 static pages.
- `npm run test:e2e` — PASS, 5/5: anonymous auth boundary, all three complete case playthroughs, and the Polish 320 px overflow regression.

Explicit env-less environment, final run:

- `NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' npm run build` — PASS, 54/54 static pages.
- `NEXT_PUBLIC_SUPABASE_URL='' NEXT_PUBLIC_SUPABASE_ANON_KEY='' npm run test:e2e` — PASS, 5/5.
- A final normal build restored the normal `out/` export afterward.

Browser QA:

- A 24-route matrix covered home, cases, all three case entries, sign-in, sign-up, callback, account redirect, leaderboard, public-profile empty state, help, FAQ, contact, privacy, and terms across 320, 375, 768, 1024, and 1440 px.
- All 24 routes rendered without console errors, broken images, or reveal targets left hidden.
- One 320 px Polish Terms overflow was found, reproduced by a failing Playwright test (`370 > 320`), fixed with localized legal-copy wrapping, and reverified at `320 === 320`.
- Incremental-scroll checks revealed all targets on home (12/12), FAQ (9/9), and cases (5/5), with zero horizontal overflow.
- Reduced-motion kept all content visible and disabled both reveal setup and the custom cursor.
- Coarse-pointer and forced-colors environments did not activate the custom cursor.
- Fine-pointer magnetic hover converged to the interactive target bounds; text inputs retained the native text cursor.
- Keyboard focus immediately revealed an off-screen FAQ item; native disclosure toggle and skip-link focus both worked.
- A real Front Door playthrough reached case closure with three present runtime receipts and no missing evidence.

Export comparison against the recorded pre-theme baseline:

- `out/`: 7,492 KB → 8,036 KB, +544 KB (about 7.3%).
- Static JS/CSS: 1,659,629 bytes → 1,707,880 bytes, +48,251 bytes (about 2.9%).
- The three optimized production-owned WebP artworks total 347,360 bytes.
- No remote placeholder-image URL was found in production scope.

## Delivery state

No commit, push, PR, merge, or deploy was performed. Those remain separate, approval-gated actions. The real-provider OAuth linking/export/deletion-reauth/token/revocation matrix also remains the external auth delivery gate documented in `docs/auth-plan.md`.
