# Implementation Plan: SEO + Core-Web-Vitals Launch Improvements

## Overview

Two audits (technical SEO + Core Web Vitals) are complete; this plan turns their
findings into a phase-by-phase, GREEN-gated implementation plan for the
`cinematic-breach-theme` redesign before it goes live at https://sqlheist.com.
No implementation happens here — this is PLAN ONLY. The single load-bearing fix
is C1 (build-time locale-correct `<html lang>`); everything else is additive and
lower-risk. `lib/engine` and `lib/schema` stay untouched throughout.

**Deployment shape (constraints that gate every decision):**
- Next.js App Router **static export** (`output:'export'`, `images:{unoptimized:true}`, no SSR, no middleware at runtime).
- i18n via **two parallel route trees**: flat `app/*` = `en` (served at `/`), `app/[locale]/*` = `tr`/`pl` only (served at `/tr`, `/pl`).
- Deployed to Vercel. Anything that can't be expressed as static HTML must live in `vercel.json` (headers/rewrites) — flagged **DEPLOY-CONFIG** below.

## Convention Guardrails (from repo CLAUDE.md — apply to every phase)

- Layered, one-way deps: `app → features → i18n/ui → lib`. **`features → app` is forbidden.** Shared chrome/logic pulled out of a layout goes DOWN a layer (ui/ or features/), never sideways into another app route.
- Colocation: every component in its own folder `X/X.tsx` + `X/X.module.css` + `X/index.ts`.
- Tests only under `tests/` (mirrors src via `@/` alias). Source dirs stay code-only.
- `lib/engine` + `lib/schema` are FROZEN (extend win-DSL additively only). This plan touches neither.
- Every phase ends GREEN: `npm run typecheck && npm test && npm run build && npm run test:e2e && npm run lint`. One scoped commit per phase. **Explicit user approval at each phase gate before commit/push and before starting the next phase.**
- After any file move / CSS-module move / route restructure: **always `npm run build`** (tsc does not catch CSS-module or route-resolution breakage — only webpack/build + e2e do).

## DEPLOY-CONFIG vs CODE (quick index)

| Item | Type | Phase |
|------|------|-------|
| `<html lang>` per locale | CODE (route restructure) | P1 |
| noindex on auth/account, per-page OG, canonical, sitemap lastMod | CODE (metadata) | P2 |
| `/user/:username` rewrite | **DEPLOY-CONFIG** (`vercel.json` rewrites) | P3 |
| `/user/[username]` shell + link repointing + `/u` deletion | CODE | P3 |
| hero preload, remove hero data-reveal, font preload flags | CODE | P4 |
| case-card AVIF/resized variants | CODE (assets) | P5 |
| `.wasm` br/gzip serving | **DEPLOY-CONFIG** (`vercel.json` headers / verify) | P5 |
| leaderboard SSG, breadcrumbs, richer schema, option-b profile prerender | CODE (optional) | P6 |

## Agent Roster

| Phase | Ana Agent | Yedek | QA Agent(s) | Parallel With |
|-------|-----------|-------|-------------|---------------|
| P1: lang architecture (C1) | frontend-dev | catalyst | code-reviewer + verifier | — (blocks all) |
| P2: indexation + metadata | frontend-dev | catalyst | code-reviewer + verifier | P4, P5 (non-overlapping) |
| P3: /user/{username} migration | frontend-dev | catalyst | code-reviewer + security-reviewer + verifier | — (after P1) |
| P4: LCP / perf | web-perf-expert | frontend-dev | code-reviewer + verifier | P2 (NOT P5 — shared file) |
| P5: asset optimization | web-perf-expert | frontend-dev | code-reviewer + verifier | P2 (NOT P4 — shared file; run P4→P5) |
| P6: optional enhancements | frontend-dev | backend-dev | code-reviewer + verifier | — |

Matrix deviation rationale:
- **P3 adds security-reviewer** — the `/user/{username}` shell reads `location.pathname` and fetches a public profile (user-generated input in a URL segment); XSS/injection + open-redirect surface must be reviewed (auth/data rule).
- **P4/P5 use web-perf-expert** (matrix Yedek: frontend-dev) instead of a generic frontend agent because both are pure Core-Web-Vitals work (LCP preload, srcset/AVIF, font strategy) — its whole description is this.
- **verifier is the final gate on every phase** per qa-loop; it receives each phase's acceptance criteria as explicit input.

---

## Phase Ordering & Dependencies

```
P1 (lang architecture) ──▶ MUST land first; P2 metadata + P3 shell live in the trees P1 reshapes
   │
   ├──▶ P2 (indexation + metadata)         P2 independent of the perf work (metadata files only)
   ├──▶ P3 (/user migration)               P3 after P1 (touches restructured routes)
   └──▶ P4 (LCP/perf) ──▶ P5 (asset opt)   P4 and P5 BOTH edit app/CinematicHomeBody.tsx
                                           → NOT independent; run P4 THEN P5
                                     │
                                     └──▶ P6 (optional, post-launch friendly)
```

P1 is sequenced first and alone because it moves route files; running P2/P3 concurrently
with P1 would collide on the same tree. Once P1 is GREEN and merged: **P2 runs in parallel
with the P4→P5 chain** (different files). **P4 and P5 must NOT run concurrently** — both
edit `app/CinematicHomeBody.tsx` (P4 removes `data-reveal` from `.heroContent`; P5 adds
`srcset`/`sizes` to the case-card `next/image`). Run P4 first, then P5. P3 follows P1.

---

## Phase 1: Locale-Correct `<html lang>` Architecture (C1 — CRITICAL, load-bearing)

**Agents:** frontend-dev (implement) → code-reviewer + verifier (QA)
**Parallel:** No — runs alone, blocks every other phase (moves route files).

### Goal
Static `/tr` HTML declares `<html lang="tr">` and `/pl` declares `<html lang="pl">`
**at build time, in the emitted HTML, without JavaScript** — so non-JS crawlers see
the correct language matching the content and the existing hreflang map. `en` at `/`
keeps `lang="en"`. The client-side `document.lang` flip (`app/[locale]/layout.tsx`
comment lines 5-8) is removed as no longer needed.

### Root cause (verified)
`app/layout.tsx:68-71` is the **single root layout** and hardcodes `<html lang="en">`.
It wraps BOTH the flat `en` tree and the nested `app/[locale]/*` tree, so `/tr` and
`/pl` inherit `lang="en"` in the static HTML. `app/[locale]/layout.tsx` is a *nested*
layout — under App Router it cannot own `<html>` while a top-level `app/layout.tsx`
exists.

### Chosen approach: multiple root layouts via a route group + shared shell
Next.js allows multiple root layouts **only if the top-level `app/layout.tsx` is
removed** and each top-level route group owns its own `<html>/<body>`.

1. **Extract the shared shell** into a locale-parameterized Server Component so chrome
   is not duplicated. New file, app layer (may import features/i18n/ui — one-way OK):
   - `app/shell/AppShell.tsx` (+ `app/shell/index.ts`) — signature
     `AppShell({ locale, children }: { locale: Locale; children: ReactNode })`.
     Renders `<html lang={locale} className={fontVars}>` → `<body>` → skip-link,
     `I18nProvider`, `AuthProvider`, Navbar/main/Footer, CookieConsent, UsernameGate,
     CinematicCursor. All the current `app/layout.tsx` body, made locale-aware.
   - `app/shell/fonts.ts` — move the four `next/font` declarations (Anton, Space
     Grotesk, Geist, Geist Mono) here and export the combined `variable` className,
     so both root layouts share one font instance (avoids double font registration).
2. **Create `app/(en)/` route group** (transparent — URLs unchanged) and MOVE every
   flat en route into it:
   - `app/page.tsx`, `account/`, `auth/`, `cases/`, `contact/`, `faq/`, `help/`,
     `leaderboard/`, `privacy/`, `terms/`, `u/` (u handled/removed in P3) → `app/(en)/…`.
   - New `app/(en)/layout.tsx` = root layout: `return <AppShell locale="en">{children}</AppShell>`.
     Re-exports the site-default `metadata` currently in `app/layout.tsx`.
3. **Promote `app/[locale]/layout.tsx` to a root layout** owning `<html>` via the shell:
   `const { locale } = await params; return <AppShell locale={locale}>{children}</AppShell>`.
   Keep its `generateStaticParams` (`tr`,`pl`) and the `notFound()` guard.
   Delete the client `document.lang` flip note/behavior.
   - **CRITICAL — carry the default metadata (prevents a /tr /pl regression).** Verified:
     `app/[locale]/*/page.tsx` (help, faq, cases, cases/[caseId], contact, privacy, terms,
     account, auth/sign-in, auth/sign-up) set **ONLY `title` + `alternates`** and today
     inherit everything else from the single shared `app/layout.tsx`. Deleting that root
     (step 4) would strip `/tr` `/pl` of: `metadataBase` (breaks auto-resolved og/twitter
     image URLs from `app/opengraph-image.png` / `twitter-image.png`), `title.template`
     (`%s · SITE_NAME`), `description`, default `openGraph`, default `twitter`, and default
     `robots`. P2 only backfills help/faq/contact/privacy/terms/leaderboard/account — NOT
     cases, cases/[caseId], auth/sign-in, auth/sign-up — so this MUST be fixed at the root,
     not per page. The promoted `app/[locale]/layout.tsx` MUST export its own locale-aware
     default `metadata`/`generateMetadata` carrying: **`metadataBase` (SITE_URL),
     `title` (`{ default, template: '%s · SITE_NAME' }`), `description`, `openGraph`
     (type/siteName/title/description — locale-aware), `twitter` (card/title/description),
     `robots` (index/follow default).** Mirror exactly what the new `app/(en)/layout.tsx`
     default carries, but localized. (og:url/canonical stay per-page via `pageAlternates`.)
4. **`app/template.tsx` (+ `app/template.module.css`) — decide fate explicitly.** Verified:
   this is Next's root `template` convention that today wraps EVERY route with
   `<ScrollReveal/>` (the engine behind the `data-reveal` system P4 edits). P1 removes the
   shared root it sits above, so it must be re-attached to BOTH new trees. **Chosen: fold
   `<ScrollReveal/>` into `AppShell`** (single shared source, no duplication, matches the
   layered/colocation intent) and delete `app/template.tsx` + `app/template.module.css`
   (its wrapper `<div className={styles.page}>` moves into AppShell). Alternative
   (duplicate into `app/(en)/template.tsx` + `app/[locale]/template.tsx`) is rejected —
   duplicates the ScrollReveal mount in two places and drifts. Add an acceptance check that
   scroll-reveal still runs on BOTH trees (below).
5. **Delete `app/layout.tsx`** (its `metadata`, fonts, and chrome now live in shell +
   the two root layouts).
6. `app/components/`, `app/siteConfig.ts`, `app/localeMeta.ts`, `app/globals.css`,
   `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.png`, `app/twitter-image.png`,
   `app/icon.svg` stay where they are — but note these are **filesystem-convention metadata**
   (Next auto-emits `<link rel="icon">` / `og:image` from files at the app root). With the
   single root removed, confirm they still resolve above BOTH trees (acceptance check below).

### Exact files
- **New:** `app/shell/AppShell.tsx`, `app/shell/index.ts`, `app/shell/fonts.ts` (AppShell now also mounts `<ScrollReveal/>`)
- **New:** `app/(en)/layout.tsx` (root layout + default en `metadata`)
- **Moved:** `app/page.tsx` + all flat en route folders → `app/(en)/…`
- **Edited:** `app/[locale]/layout.tsx` (becomes root layout via AppShell + exports its own locale-aware default `metadata`/`generateMetadata`)
- **Deleted:** `app/layout.tsx`, `app/template.tsx`, `app/template.module.css` (ScrollReveal folded into AppShell)
- **Unmoved (filesystem-convention metadata, must still resolve above both trees):** `app/icon.svg`, `app/opengraph-image.png`, `app/twitter-image.png`
- **Untouched:** `lib/**`, `features/**` internals, `i18n/**`, `ui/**`

### Acceptance criteria (VERIFY in emitted static HTML)
> **Export layout:** `next.config.mjs` has `output:'export'` with **`trailingSlash` UNSET (=false)** → the export produces **FLAT files**, not `.../index.html`. Only the root `/` emits `out/index.html`. Every other page is `out/<path>.html`. Locale homes are `out/tr.html` / `out/pl.html`. Do NOT set `trailingSlash:true`. All grep paths below follow this flat convention.
- `grep -o 'lang="[a-z]*"' out/tr.html` → `lang="tr"`; `out/pl.html` → `lang="pl"`; `out/index.html` → `lang="en"`.
- Spot-check a deep page: `out/tr/help.html` → `lang="tr"`, `out/pl/cases.html` → `lang="pl"`, `out/help.html` → `lang="en"`.
- hreflang block unchanged in each page's `<head>` (grep `hreflang="tr"` present on `out/index.html`).
- No `<html lang>` mutation in the client bundle: `grep -r "documentElement.lang" out/_next/static` returns nothing (flip removed).
- URLs unchanged: `out/` still emits `index.html`, `help.html`, `tr.html`, `pl/help.html` (route group `(en)` added no path segment).
- **No metadata regression on /tr /pl** (fix in step 3): `grep -i 'og:title\|twitter:card\|og:image' out/tr/cases.html out/tr/auth/sign-in.html` → present (these pages set only title+alternates, so they must still inherit OG/Twitter defaults from the promoted root); `<title>` on `out/tr/help.html` still carries the ` · SITE_NAME` suffix (template preserved); `og:image` URL is absolute (metadataBase preserved).
- **ScrollReveal runs on BOTH trees** (fix in step 4): grep the built HTML/JS for the ScrollReveal mount on an en page AND a `/tr` page; e2e reveal behavior (below-fold reveal) passes on both — reuse `tests/e2e/responsive-content.e2e.ts` / `tests/e2e/cases.e2e.ts` and add a reveal assertion if not covered.
- **Icon + OG image present on both locale homes** (fix in step 6): `grep 'rel="icon"' out/tr.html out/pl.html` → present; `grep 'og:image' out/tr.html out/pl.html` → present (filesystem-convention assets still resolve above both trees).
- Full GREEN gate (build is the real check here — tsc will NOT catch route-resolution or CSS-module breakage from the move).

### Risk: **HIGH**
Largest structural change; multiple root layouts is a strict Next.js pattern (top-level
`app/layout.tsx` MUST be gone or the build errors). Font double-registration and
provider nesting are the likely breakage points. Mitigation: extract shell FIRST and
build; move routes SECOND and build again; run e2e (`tests/e2e/cases.e2e.ts` +
`responsive-content.e2e.ts` + `auth-anon.e2e.ts` already exist) to confirm chrome/providers
still mount on both trees.

---

## Phase 2: Indexation + Per-Page Metadata (H1, M1, M2, M4, L1, L4)

**Agents:** frontend-dev (implement) → code-reviewer + verifier (QA)
**Parallel:** Yes — with P4 and P5 (metadata files vs perf/asset files, non-overlapping). After P1.

### Goal
Every indexable page ships correct, self-consistent metadata in its static HTML:
auth/account pages are `noindex,follow`; content pages carry per-page OG/Twitter
title+desc+url; `og:url` == canonical everywhere; the two route trees agree; sitemap
carries a `lastModified`; a missing canonical fails loud instead of silently pointing
at `/`.

### Steps
1. **H1 — noindex private pages.** Add `robots:{ index:false, follow:true }` to the
   metadata of `auth/sign-in`, `auth/sign-up`, `account` in **both** trees
   (`app/(en)/auth/…`, `app/(en)/account/…`, `app/[locale]/auth/…`, `app/[locale]/account/…`).
   `auth/callback` already has it — leave as is. (Already absent from sitemap; no sitemap change for these.)
2. **M1 + M2 — per-page OG/Twitter + og:url = canonical.** Extend `app/localeMeta.ts`
   with a helper that returns full per-page metadata, not just alternates:
   `pageMeta(base, locale, { title, description })` → `{ alternates: pageAlternates(base, locale), openGraph: { url: canonical, title, description, type, siteName }, twitter: { card, title, description } }`.
   Apply it in each content page's `metadata`/`generateMetadata`: help, faq, contact,
   privacy, terms, leaderboard (and their `[locale]` twins). `og:url` is set to the
   page's own canonical (never the root `SITE_URL`).
3. **M4 — harmonize the two trees.** Make `account` (and any other page setting only
   `title`) set the same title+description shape in both trees via `pageMeta`. Audit
   each page pair for drift; the helper makes them identical by construction.
4. **L1 — sitemap lastModified.** In `app/sitemap.ts`, add `lastModified: new Date()`
   (build-time date) to every entry (marketing, board, cases).
5. **L4 — drop the default canonical.** Remove `alternates: { canonical: '/' }` from
   the site-default metadata (now in `app/(en)/layout.tsx` / shell). With no default,
   any page that forgets its own `alternates` emits NO canonical (loud/visible in
   audit) instead of silently claiming `/`. Every real page already sets its own via
   `pageAlternates` — confirm none regress to blank.

### Exact files
- `app/localeMeta.ts` (extend with `pageMeta`)
- `app/(en)/auth/sign-in/…`, `sign-up/…`, `account/…` + `app/[locale]/auth/…`, `account/…` (robots)
- Content page `metadata` in both trees: `help`, `faq`, `contact`, `privacy`, `terms`, `leaderboard`
- `app/sitemap.ts` (lastModified)
- Site-default metadata in `app/(en)/layout.tsx` (drop default canonical)
- **Untouched:** `lib/**`, engine/schema

### Acceptance criteria (VERIFY in static HTML)
- `grep -i 'noindex' out/auth/sign-in.html out/auth/sign-up.html out/account.html` → present; same for `out/tr/auth/sign-in.html`.
- `out/cases.html` and content pages have `robots` = index (unchanged); auth/account do NOT appear in `out/sitemap.xml`.
- `out/help.html`: `og:title`/`og:description` are the page's own (not the site default); `og:url` == the `<link rel="canonical">` href. Same check on `out/tr/help.html` (canonical `/tr/help`).
- `out/sitemap.xml` entries carry `<lastmod>`.
- Grep a page for exactly one `<link rel="canonical">`; grep the whole `out/` for any stray `canonical" href=".../"` on a non-home page (L4 regression check).

### Risk: **LOW–MEDIUM**
Pure metadata; main trap is the two-tree drift (M4) — the shared `pageMeta` helper is
the mitigation. L4 (dropping default canonical) needs the regression grep so no page
silently ends up canonical-less.

---

## Phase 3: `/user/{username}` Path Migration (technical-SEO H2) + vercel.json rewrite

**Agents:** frontend-dev (implement) → code-reviewer + security-reviewer + verifier (QA)
**Parallel:** No — after P1 (touches restructured routes + all profile links).

### Goal (USER DECISION — recorded)
Replace the query-param public profile `/u?name=X` entirely with a clean path URL
`/user/{username}`, giving each profile a proper canonical path URL, while staying
compatible with pure static export.

### Constraint
Pure static export cannot prerender arbitrary user-generated usernames:
`generateStaticParams` + `dynamicParams=false` requires ALL params at build; an
unknown username → 404. So arbitrary `/user/anything` cannot be a real prerendered file.

### Chosen approach — BASELINE = option (a): rewrite + single client shell (ship first)
1. **DEPLOY-CONFIG** — add a rewrite to `vercel.json`:
   `"rewrites": [{ "source": "/user/:username", "destination": "/user/__shell" }]`
   (destination = the one prerendered shell path; exact shell path finalized in code so
   it matches the emitted file). This makes every `/user/<anything>` serve the shell
   HTML while the browser URL stays the clean canonical path.
2. **CODE** — add a single prerendered shell route `app/(en)/user/[username]/` that is
   built as ONE known page (via `generateStaticParams` returning a single placeholder,
   or a static `app/(en)/user/shell/` — final form chosen in code to match the rewrite
   destination). The shell is `'use client'`, reads `location.pathname`, extracts the
   username, and fetches the profile via the SAME data path as today's query-param
   version. It sets a per-page `<link rel="canonical">` to `/user/<username>` client-side
   (documented as a client-set canonical — see trade-off note).
3. **CODE** — delete the old routes `app/u/` and `app/[locale]/u/` (now `app/(en)/u/`
   after P1). **Archive, do not hard-delete without approval** per safety rule — move to
   an archive location or delete only on explicit user OK at the phase gate.
4. **CODE** — repoint every profile link from `/u?name=X` to `/user/X`. Verified: exactly
   TWO call sites — `features/leaderboard/LeaderboardTable/LeaderboardTable.tsx:231` and
   `features/profile/AccountPanel/AccountPanel.tsx:308` (both build the link via
   `localeHref(\`/u?name=${encodeURIComponent(...)}\`, locale)`). NOT `UserMenu` (it has no
   such link). Re-grep `u?name=` across `app/`, `features/` to confirm no others before/after.
   Keep `encodeURIComponent` on the path segment; validate on read. Note: `getPublicProfile()`
   already validates the username before the Supabase query (reviewer-confirmed) — the shell
   reuses it, so validation is not re-implemented, only preserved.
5. **CODE** — sitemap/robots: the `/user` shell stays OUT of `app/sitemap.ts` (individual
   profiles are client-rendered, not prerendered). No robots change needed (no new
   indexable static files); optionally the shell metadata sets `robots:{index:false}` if
   the placeholder shell must never itself be indexed.

### Prerender scope decision (present BOTH so the user can flip)
- **(a) BASELINE — no build-time prerender.** All profiles via rewrite + client fetch.
  Simplest, ships for launch. Per-profile SEO meta (title/OG) is client-set only, so
  non-JS crawlers see the generic shell. **Recommended for launch.**
- **(b) OPTIONAL LATER (P6) — opt-in / top-leaderboard prerender.** Statically prerender
  build-time-known usernames (opt-in flag or top-N leaderboard) via `generateStaticParams`
  + `dynamicParams=false`, giving those profiles real per-profile `<title>`/OG in static
  HTML; the rewrite stays as the fallback for everyone else. Richer SEO, more build
  coupling to profile data. Deferred — see Phase 6.

### Exact files
- `vercel.json` (rewrites — DEPLOY-CONFIG)
- **New:** `app/(en)/user/[username]/` shell (`.tsx` + `.module.css` + `index.ts`, colocated)
- **Deleted/archived:** `app/(en)/u/`, `app/[locale]/u/`
- **Edited:** `features/leaderboard/LeaderboardTable/LeaderboardTable.tsx:231`, `features/profile/AccountPanel/AccountPanel.tsx:308` (the only two `/u?name=` callers — verified; NOT UserMenu)
- `app/sitemap.ts` (confirm shell excluded)
- **Untouched:** `lib/**`, the profile DATA fetch (reused verbatim), engine/schema

### Acceptance criteria (VERIFY)
- `out/user/…` contains exactly ONE prerendered shell HTML (flat, e.g. `out/user.html` or the shell's actual emitted path); no per-username files (baseline). Confirm the emitted path and match `vercel.json` `destination` to it EXACTLY.
- `grep -rn "u?name=" app features` → zero hits after repoint; all profile links use `/user/`.
- `vercel.json` has the `/user/:username` rewrite; JSON is valid (`node -e "require('./vercel.json')"`).
- `out/u.html` and `out/tr/u.html` no longer emitted (old routes gone).
- Shell sets canonical `/user/<name>` (manual: load `/user/testuser`, inspect DOM `<link rel=canonical>` + network shows profile fetch to the same endpoint as before).
- security-reviewer PASS: username from path is `encodeURIComponent`-safe on write and validated on read; no `dangerouslySetInnerHTML` with the raw name; no open-redirect from the pathname parse.
- Sitemap does NOT list `/user`.

### Risk: **MEDIUM**
Rewrite/shell coupling (rewrite destination must exactly match the emitted shell path —
verify against `out/` after build, not by assumption). Deleting `/u` is one-way — archive
+ approval. User-generated username in a URL is the reason security-reviewer is on this phase.

---

## Phase 4: LCP / Core Web Vitals (perf H1, perf H2, perf M2)

**Agents:** web-perf-expert (implement) → code-reviewer + verifier (QA)
**Parallel:** With P2 only. **NOT with P5** — both P4 and P5 edit `app/CinematicHomeBody.tsx`; run P4 THEN P5. After P1 (shell owns `<head>`).

### Goal
Land the biggest LCP wins with no visual regression: the hero background image is
discoverable by the preload scanner and no longer re-registered ~600ms late, and
below-fold fonts stop competing for early bandwidth.

### Steps
1. **perf H1 — preload the LCP hero image.** The hero is a CSS `background-image:
   url(/hero-vault-brass.webp)` (`app/cinematic-home.module.css:69-79`, ~80KB) — LCP-
   eligible but invisible to the preload scanner. Add to the document `<head>` (now
   owned by `app/shell/AppShell.tsx` after P1):
   `<link rel="preload" as="image" href="/hero-vault-brass.webp" fetchpriority="high">`.
   Only the `en`/`(en)` + `[locale]` home routes need it; since the shell is shared,
   gate the preload so it only emits on the landing route (e.g. a `showHeroPreload`
   prop passed by the home page, or render the `<link>` from the home `page.tsx` head
   via metadata — chosen in code). Biggest single LCP win.
   - Alternative considered: convert the CSS background to `next/image` with `priority`.
     Rejected for launch — `images:{unoptimized:true}` means next/image gives no srcset
     benefit here and would restructure the hero markup/CSS; a plain preload link is the
     minimal, lowest-risk fix. (Revisit only if the hero needs art-direction.)
2. **perf H2 — remove reveal animation from the LCP block.** `.heroContent`
   (`app/CinematicHomeBody.tsx:131`) has `data-reveal="left"`; after hydration
   `globals.css:366-372` drops it to `opacity:0` with a 600ms transition, re-registering
   LCP ~600ms later. Remove `data-reveal` from the above-fold/LCP block. Keep ScrollReveal
   for BELOW-fold blocks only. Verify content is still visible without JS (it already is).
3. **perf M2 — trim font preloading.** Four font families preload (`app/shell/fonts.ts`
   after P1, was `app/layout.tsx:20-40`, ~233KB/17 woff2). Space Grotesk is below-fold-only
   → set `preload:false` on its `Space_Grotesk({...})`. Consider `preload:false` for Geist
   Mono too (code surface is below fold / interaction-time). Keep Anton (hero wordmark) and
   Geist Sans (body) preloaded.

### Exact files
- `app/shell/AppShell.tsx` (or home `page.tsx` metadata) — hero preload `<link>`
- `app/CinematicHomeBody.tsx` — remove `data-reveal` from `.heroContent`
- `app/shell/fonts.ts` — `preload:false` on Space Grotesk (+ maybe Geist Mono)
- **Untouched:** `lib/**`, engine/schema, reduced-motion/cursor code (already correct — DO NOT touch)

### Acceptance criteria (VERIFY in static HTML + build)
- `grep 'rel="preload".*hero-vault-brass' out/index.html` → present with `as="image"` and `fetchpriority="high"`; and present on `out/tr.html`, `out/pl.html`; ABSENT on a non-home page (`out/help.html`) if route-gated.
- `grep 'data-reveal' out/index.html` → the hero/above-fold block no longer carries it (below-fold reveals may remain).
- Font `<link rel="preload" as="font">` count in `out/index.html` drops (Space Grotesk / Geist Mono no longer preloaded); Anton + Geist Sans still preloaded.
- No visual regression: e2e `tests/e2e/responsive-content.e2e.ts` + `tests/e2e/cases.e2e.ts` GREEN; manual check hero renders identically.
- Full GREEN gate.

### Risk: **LOW**
Additive `<head>` link + one attribute removal + font flags. Main watch: route-gating the
hero preload so it doesn't ship on every page, and not touching the already-correct
reduced-motion/cursor/code-split work the audit flagged as off-limits.

---

## Phase 5: Asset Optimization (perf M1, perf M4)

**Agents:** web-perf-expert (implement) → code-reviewer + verifier (QA)
**Parallel:** With P2 only. **NOT with P4** — shared file `app/CinematicHomeBody.tsx`; run P4 THEN P5. After P1.

### Goal
Stop shipping oversized decorative images and confirm the 644KB wasm is served
compressed — recovering ~344KB of image bytes and ~440KB of wasm transfer with no
visual change.

### Steps
1. **perf M1 — resize/AVIF the decorative case cards.** `app/CinematicHomeBody.tsx:207-214`
   renders three `next/image` case cards at full 1536×1024 with no srcset (because
   `images:{unoptimized:true}`): case-vault 156KB, case-front-door 104KB, case-quiet-room
   84KB (~344KB). They are below-fold + lazy but far larger than their render box.
   - **Pre-generate resized + AVIF variants** at the actual display size (measure the
     rendered box, generate ~2 DPR variants), place under `public/`, and reference them
     with an explicit `srcset`/`sizes` (or swap to the resized single asset + AVIF with a
     `<picture>`/`next/image` unoptimized fallback). Because export is unoptimized, the
     resizing is a build-asset step, not a runtime one — commit the generated files.
   - Keep them lazy + below-fold; no LCP impact, pure transfer savings (~344KB).
2. **perf M4 — verify wasm compression (DEPLOY-CONFIG).** `public/sql-wasm.wasm` is 644KB
   uncompressed, loaded on-demand (already good — code-split off landing). Verify the host
   serves `br`/`gzip` for `.wasm` (compresses to ~200KB). This is a Vercel serving concern,
   not code:
   - Confirm Vercel's default compression covers `application/wasm`; if not, add a
     `vercel.json` header entry documenting/forcing `Content-Encoding` handling for
     `/*.wasm` (final form depends on what the deploy actually serves — verify with
     `curl -I -H 'Accept-Encoding: br' https://<preview>/sql-wasm.wasm`).

### Exact files
- `public/` — new resized/AVIF case-card variants (generated assets, committed)
- `app/CinematicHomeBody.tsx` — reference the resized/AVIF variants (srcset/sizes)
- `vercel.json` — wasm compression header IF the preview shows it's not already compressed (DEPLOY-CONFIG)
- **Untouched:** `lib/**`, engine/schema, `sql-wasm.wasm` itself + its on-demand load path

### Acceptance criteria (VERIFY)
- Generated case-card variants exist in `public/` and are byte-smaller; total case-card transfer materially below ~344KB.
- `out/index.html` (or the home chunk) references the resized/AVIF assets with `srcset`/`sizes`; cards render identically (manual + `tests/e2e/cases.e2e.ts` GREEN).
- `curl -sI -H 'Accept-Encoding: br' https://<preview-url>/sql-wasm.wasm | grep -i content-encoding` → `br` (or `gzip`) on the deployed preview (DEPLOY-CONFIG check, done at preview/deploy time, not in local build).
- Full GREEN gate.

### Risk: **LOW**
Below-fold assets; worst case a variant path is wrong → build/e2e catches a broken image.
Wasm compression is a deploy-config verification, not a code change — flagged so it isn't
mistaken for done by a green local build.

---

## Phase 6: Optional Enhancements (M3, L3/L5, profile prerender option-b)

**Agents:** frontend-dev (implement) → code-reviewer + verifier (QA); backend-dev if leaderboard data path grows a build-time source.
**Parallel:** No — post-launch friendly; each item independently shippable.

These are NOT launch blockers. Each is a separate scoped commit; ship any subset.

1. **M3 — leaderboard SSG (optional).** `features/leaderboard/LeaderboardTable` is
   `'use client'` with no server props → static HTML has empty rows. Under static export
   there is no request-time data, but a **build-time** fetch (opt-in) could seed initial
   rows into the HTML for crawlers. Document the trade-off: build-time snapshot goes stale
   until next deploy. Default: leave client-fetched, just DOCUMENT the trade-off.
2. **L3/L5 — richer structured data.**
   - Breadcrumb JSON-LD currently only on case detail → add to the `/cases` board and the
     content pages (help/faq/etc.).
   - `SoftwareApplication` schema is minimal → optionally add `aggregateRating` /
     `screenshot`. Only add fields that are truthful (no fake ratings).
3. **Profile prerender option (b) — from Phase 3.** Statically prerender build-time-known
   opt-in / top-leaderboard usernames via `generateStaticParams` + `dynamicParams=false`,
   giving those profiles real per-profile `<title>`/OG in static HTML, with the P3 rewrite
   as fallback for everyone else. Flip from baseline (a) only when per-profile SEO is worth
   the build coupling to profile data.

### Acceptance criteria
- Any shipped item: valid schema (Google Rich Results test passes on the emitted JSON-LD), no fabricated data, full GREEN gate. Items are independent — partial completion is fine.

### Risk: **LOW** (all optional, additive, post-launch).

---

## Rejected Architectural Alternatives

### C1 `<html lang>` fix — rejected: keep the client-side `document.lang` flip
The current mechanism (`app/[locale]/layout.tsx` flips `document.documentElement.lang`
on hydration) is exactly the bug: non-JS crawlers never run it, so static `/tr` `/pl`
HTML declares `lang="en"`. **Rejected** because it does not fix the build-time HTML.
Also rejected: a **middleware / SSR locale rewrite** — impossible under `output:'export'`
(there is no server or middleware at runtime; every page is a prebuilt file). The only
way to get locale-correct `<html lang>` in the emitted HTML is a build-time root layout
per locale — hence the multiple-root-layouts + shared-shell restructure chosen in P1.

### C1 — rejected: single root layout reading locale from `params`
Keeping one `app/layout.tsx` and deriving locale from `params` fails because the flat
`en` tree has NO `[locale]` segment, so the shared root layout has no param to read for
`en`, and App Router forbids a nested layout owning `<html>`. Two root layouts is the
canonical Next.js answer.

### /user prerender — rejected for launch: full `generateStaticParams` of all usernames
Prerendering every username is impossible for arbitrary user-generated names under static
export (unknown param → 404). **Chosen baseline = (a)** rewrite + one client shell (ships
now, clean canonical path). **Option (b)** (prerender only build-time-known opt-in / top-N
usernames, rewrite as fallback) is deferred to P6 — richer per-profile SEO, but couples the
build to profile data. Present both; recommend (a) for launch, (b) as a follow-up flip.

### perf H1 hero — rejected: `next/image priority` for the hero
Under `images:{unoptimized:true}` next/image yields no srcset benefit and would restructure
the hero CSS/markup. A plain `<link rel=preload as=image fetchpriority=high>` is the minimal
LCP fix. Rejected next/image for launch.

---

## Testing Strategy

The decisive test for SEO work is **grep the emitted `out/` static HTML** — unit/e2e
confirm nothing broke, but the audit findings only count if they appear in the shipped
files a crawler downloads.

- **Static-HTML assertions (per phase, the real gate for SEO):** after `npm run build`,
  grep `out/` for the phase's acceptance strings (`lang`, `noindex`, `canonical`, `og:url`,
  `rel="preload"`, sitemap `lastmod`, absence of `/u/`). These are listed inline per phase.
  Consider codifying a few as a `tests/unit/app/*.test.ts` that reads built files (optional).
- **Component tests (`tests/components/`)** — jsdom, for the `/user` shell parse of
  `location.pathname` and the leaderboard link repointing.
- **e2e (`tests/e2e/*.e2e.ts`, Playwright)** — the existing specs (verified: `cases.e2e.ts`
  = board-return nav + mobile case nav + per-case objective playthroughs (the "guided
  objectives" coverage); `responsive-content.e2e.ts` = mobile/responsive + Polish legal
  overflow; `auth-anon.e2e.ts`) must stay GREEN after P1's route move and P3's link changes;
  add a `/user/<name>` navigation spec in P3.
- **Security (P3)** — security-reviewer manual pass on the username-in-URL path (encode on
  write, validate on read, no raw-name injection, no open redirect).
- Tests live ONLY under `tests/` (mirror src via `@/`). No test files in `app/ features/ lib/ i18n/ ui/`.

---

## Risks & Mitigations

- **Risk (HIGH): P1 route move breaks the build (multiple root layouts, CSS-module paths, font double-registration).**
  - Mitigation: extract shell + fonts and build FIRST; move routes SECOND and build again; run e2e. Never trust tsc alone for a route/CSS-module move — `npm run build` is the gate.
- **Risk: two independent root layouts make cross-tree navigation a FULL page reload.** Promoting `app/(en)` and `app/[locale]` to separate root layouts means a `LanguageSwitcher` `router.push` between `en` (`/`) and `tr`/`pl` (`/tr`, `/pl`) does a full document reload, NOT a soft client transition — this is expected/unavoidable Next behavior for multiple root layouts.
  - Mitigation: manual check that `AuthProvider` session, `CookieConsent` acceptance, and `UsernameGate` state SURVIVE the reload (they should, via Supabase session + localStorage) — verify, don't assume. Add to the P1 manual QA checklist.
- **Risk: P3 rewrite destination drifts from the emitted shell path** (rewrite points at a file that doesn't exist → 404 for all profiles).
  - Mitigation: after build, verify the shell's actual `out/user/…` path and match `vercel.json` `destination` to it; add a `/user/<name>` e2e nav test.
- **Risk: L4 (dropped default canonical) leaves a page canonical-less.**
  - Mitigation: regression grep across `out/` for any non-home page missing `<link rel="canonical">`.
- **Risk: hero preload ships on every page** (wasted bytes on non-LCP pages).
  - Mitigation: route-gate the preload to the home route; grep `out/help.html` confirms absence.
- **Risk: deleting `/u` is one-way.**
  - Mitigation: archive (move), don't hard-delete; explicit user approval at the P3 gate.
- **Risk: DEPLOY-CONFIG items (wasm compression, `/user` rewrite) look "done" on a green local build but are only real on Vercel.**
  - Mitigation: both are explicitly tagged DEPLOY-CONFIG and verified on a **preview deploy** (`curl -I`), not by local build.
- **Risk: touching the already-correct perf work** (reduced-motion cursor, code-split, ScrollReveal) the audit flagged off-limits.
  - Mitigation: P4/P5 scope is enumerated file-by-file; those files are not in scope.
- **Frozen contract:** `lib/engine` + `lib/schema` are not touched by any phase — confirm in each phase's diff.

---

## Success Criteria

- [ ] **C1:** `out/tr.html` → `lang="tr"`, `out/pl.html` → `lang="pl"`, `out/index.html` → `lang="en"` (in static HTML, no JS; flat export — trailingSlash false). Client `document.lang` flip removed.
- [ ] **C1 no-regression:** `/tr` `/pl` pages that set only title+alternates (cases, auth/*) still inherit OG/Twitter/metadataBase/title-template from the promoted `[locale]` root; ScrollReveal runs on both trees; icon + og:image present on `out/tr.html`/`out/pl.html`.
- [ ] **H1:** `/auth/sign-in`, `/auth/sign-up`, `/account` (both trees) emit `noindex,follow`; absent from sitemap.
- [ ] **M1/M2:** content pages carry per-page OG/Twitter title+desc; `og:url` == canonical on every page.
- [ ] **M4:** the two route trees emit identical metadata shape per page (no drift).
- [ ] **L1:** `out/sitemap.xml` entries carry `<lastmod>`.
- [ ] **L4:** no page silently inherits canonical `/`; a missing canonical is visible.
- [ ] **H2 (SEO):** `/u?name=` fully replaced by `/user/{username}`; `/u` routes gone; all links repointed; rewrite in `vercel.json`; shell sets clean canonical; sitemap excludes `/user`; security-reviewer PASS.
- [ ] **perf H1:** hero `/hero-vault-brass.webp` preloaded (`as=image`, `fetchpriority=high`) on home routes only.
- [ ] **perf H2:** LCP hero block no longer carries `data-reveal` (no ~600ms re-register).
- [ ] **perf M2:** Space Grotesk (and optionally Geist Mono) `preload:false`; Anton + Geist Sans still preloaded.
- [ ] **perf M1:** case cards served resized/AVIF (~344KB saved), below-fold + lazy, no visual change.
- [ ] **perf M4 (DEPLOY-CONFIG):** `.wasm` served `br`/`gzip` on preview (`curl -I` confirmed).
- [ ] **P6 (optional):** M3 trade-off documented; breadcrumb/SoftwareApplication schema added if shipped; option-b prerender decision recorded.
- [ ] Every phase ended GREEN (`typecheck && test && build && test:e2e && lint`) with one scoped commit and user approval at the gate.
- [ ] `lib/engine` + `lib/schema` untouched across all phases.

---

## Final Pre-Deploy Gate

Because this work touches **routes, canonical, and hreflang**, a final green gate is NOT
sufficient on its own — a **re-verification of the static-export output** is REQUIRED
before deploy:

1. Full GREEN: `npm run typecheck && npm test && npm run build && npm run test:e2e && npm run lint`.
2. **Re-verify `out/` after the final build** (routes/canonical/hreflang are HTML-only facts; **flat export — `out/<path>.html`, locale homes `out/tr.html`/`out/pl.html`, only `/` is `out/index.html`**):
   - `lang` correct per locale on home + a deep page each: `out/index.html`/`out/tr.html`/`out/pl.html` and `out/help.html`/`out/tr/help.html`/`out/pl/cases.html`.
   - hreflang map intact and reciprocal; every page's canonical points at itself.
   - No /tr /pl metadata regression (OG/Twitter/metadataBase/title-template inherited); ScrollReveal on both trees; icon + og:image on `out/tr.html`/`out/pl.html`.
   - noindex present on `out/auth/sign-in.html`/`out/account.html` (+ `/tr` twins); sitemap lists the right URLs with `lastmod`, excludes `/user` + auth/account.
   - `out/u.html`/`out/tr/u.html` gone; `/user/` shell present and its emitted path matches the `vercel.json` rewrite destination EXACTLY.
   - hero preload present on home only (`out/index.html`/`out/tr.html`/`out/pl.html`, absent on `out/help.html`); font preloads trimmed.
3. **DEPLOY-CONFIG verified on a Vercel PREVIEW (not local):** `/user/:username` rewrite
   resolves; `.wasm` served compressed (`curl -I -H 'Accept-Encoding: br'`).
4. Deploy only after 1–3 pass and the user approves the final gate.
5. `@verifier` runs with each phase's acceptance criteria (and this list) as explicit input;
   anything not provable is marked `UNVERIFIED`, not assumed.
