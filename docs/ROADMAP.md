# SQL Heist — Post-MVP Roadmap

> Generated: 2026-07-30 · **Status update (2026-08-19): WS0–WS4 are shipped; WS5 (auth) is the only remaining track.**
> The game is live on Vercel as **three cases / eight objectives** — full UI + narrative,
> recon notebook + badges, multi-stack secure-code debrief, and i18n (en/tr/pl) are all done.
> The workstream detail below is kept as the historical plan of record. Ordering rationale
> (still valid for WS5): settle the UI surface first, internationalize last, and treat auth as
> a separate initiative because it breaks the current static-only model.

## Sequence at a glance

| WS | Workstream | Depends on | Size |
|----|------------|-----------|------|
| **WS0** | QA polish sweep (a11y · UI code review · web-perf · P1 minor cleanup) | MVP | S |
| **WS1** | Core UX + app shell (back nav · exploit-screen context · navbar · SQL-Noir-flavored pages) | WS0 | M |
| **WS2** | Multi-language secure-code examples in the debrief (10 backend stacks) | WS1 (debrief UI touched) | M |
| **WS3** | v1 content (new techniques · recon notebook · badges) | WS0 (engine) | L |
| **WS4** | i18n (en / tr / pl) | WS1–WS3 (final string surface) | L |
| **WS5** | Auth (progress sync + leaderboard) — separate initiative | own arch decision | XL |

WS0→WS1→WS2 and WS3 are largely independent/pipelineable; **WS4 (i18n) must come last** among UI work; **WS5 (auth) is a separate track** with its own planning cycle.

---

## WS0 — QA polish sweep
**Goal:** lock a quality baseline on the shipped MVP before piling on features.
**Tasks**
- a11y audit of the game UI (semantic color law actually colorblind-safe, keyboard nav, focus order, AA contrast, 44px targets) — the design promised this; verify it.
- UI code review of `features/game/*` (component boundaries, K7 XSS ban, file sizes, dead code).
- Web-perf pass (bundle size, lazy-load boundaries, first-load; the in-game route is `/cases/[caseId]`).
- Close the open P1 engine findings: `sqlLoader` retry-path test (Medium); `visibleSchema` copy-on-read; `exact`-mode cardinality clarification; `starsForScore` magic numbers; doc drift (01 §3.2 `segments`).
**Agents:** `a11y-expert` ∥ `code-reviewer` ∥ `web-perf-expert` (audit) → `spark`/`frontend-dev` + `kraken` (fixes) → `verifier` (gate).
**Acceptance:** audit findings triaged; criticals fixed; tsc/test/build/lint green; E2E still green.

## WS1 — Core UX + app shell
**Goal:** make the game feel complete and navigable; establish the site shell in SQL-Noir taste.
**Tasks**
- **Back navigation:** revisit prior phases (esp. Recon from Exploit) without resetting the engine session; a "back to The Board" control.
- **Exploit-screen context:** show the objective + a collapsible recon recap (target + `visibleSchema`) on the Exploit screen so the player never loses "what am I doing / what did I see."
- **Navbar** (SQL-Noir-flavored, our heist theme): **Home · Jobs · Help · Share · Language(en/tr/pl placeholder)**. (Auth entry point stubbed, built in WS5.)
- **New pages** (adapt SQL Noir's inventory — Help, FAQ, Privacy, Terms, Contact — to our theme; structure/UX taste only, not their content/branding). Fetch SQL Noir at build time to match feel.
- **Share:** OPEN DECISION — share the game link, or a result card ("I cracked The Vault"). Recommend both (link now, result card optional).
**Agents:** `frontend-dev` (nav/shell/pages) + `designer` (visual consistency) + `copywriter` (Help/FAQ/legal copy in heist voice) → `code-reviewer` + `a11y-expert`.
**Acceptance:** back nav preserves session; exploit context visible; navbar + pages build under static export; a11y clean.
**Note:** the Language switcher is a **placeholder** here; actual translation is WS4.

## WS2 — Multi-language secure-code examples
**Goal:** in each job's debrief, show the parameterized fix across many backend stacks — reinforcing that the defense is universal, not SQLite-specific.
**Schema change:** `debrief.secureCode` → a map/array keyed by stack (`{ id, label, language, code }[]`), rendered as tabs in `DebriefPanel`. Keep one default expanded.
**The 10 backend stacks** (parameterized queries / prepared statements — bind, never concatenate):
1. Node.js — `pg` / `mysql2` (Express)
2. Python — `sqlite3` / `psycopg2` (DB-API params)
3. PHP — PDO prepared statements
4. Java — JDBC `PreparedStatement`
5. C# / .NET — ADO.NET parameters / EF Core
6. Go — `database/sql` placeholders
7. Ruby on Rails — ActiveRecord
8. Laravel (PHP) — Query Builder / Eloquent
9. Django (Python) — ORM / parameterized `.raw`
10. Spring Boot (Java) — `JdbcTemplate` / JPA
**Content:** 3 jobs × 10 stacks = 30 short, CORRECT snippets. Content-safety matters — a wrong "secure" example teaches bad practice.
**Agents:** `architect`/`data-modeler` (schema change) → `security-analyst` + `backend-dev` (write + verify snippets per stack) → `frontend-dev` (tabbed DebriefPanel) → `code-reviewer` + `security-reviewer` (correctness sign-off).
**Acceptance:** every snippet uses real parameter binding for that stack; tabs render; golden/schema tests green.

## WS3 — v1 content
**Goal:** extend the curriculum beyond the 3 MVP jobs.
**Tasks**
- New techniques: **error-based**, **blind boolean**, **blind time-based**, **stacked queries**, **WAF/filter bypass**. Some need engine additions (blind → boolean/timing oracle win-conditions; WAF → an input filter layer in the level).
- **Recon notebook:** auto-collect discovered tables/columns across a job.
- **Badges / achievements:** per-technique mastery.
**Agents:** `architect` (engine additions design) → `kraken` (engine, TDD) + `data-modeler`/`backend-dev` (new level JSONs) + `security-analyst` (technique content) → `frontend-dev` (notebook + badges UI) + `designer` → `arbiter` + `verifier`.
**Acceptance:** each new job solvable + golden-tested; new win-condition types covered; engine stays data-driven.

## WS4 — Internationalization (en / tr / pl)
**Goal:** translate the user-facing UI into English, Turkish, Polish. **Runs after WS1–WS3** so the string surface is final.
**Tasks**
- i18n framework (next-intl or react-i18next) + message extraction; locale routing/switcher wired to the WS1 navbar.
- Translate all user-facing strings + narrative copy. Code/identifiers/comments stay **English** (project rule); only display strings are localized.
- Locale-aware formatting; no RTL needed (en/tr/pl all LTR).
**Open decisions:** who provides quality **PL** translation? (TR = user is native, can review.) The Fixer's noir slang is idiomatic — translation must preserve voice, not literal.
**Agents:** `i18n-expert` (framework + extraction) + `babel` (locale UX) + `copywriter`/translators (content) → `frontend-dev` (wire) → `code-reviewer` + `a11y-expert`.
**Acceptance:** all 3 locales switchable; no hardcoded display strings; build green per locale.

## WS5 — Auth (progress sync + leaderboard) — SEPARATE INITIATIVE
**Goal:** accounts so progress syncs across devices and a leaderboard exists. **Purpose confirmed: progress + leaderboard.**
**Architectural impact (the big one):** the app is currently **100% client-side static** (no backend). Auth + persistent progress + leaderboard **require a backend or BaaS**. This changes the deployment model.
**Key decisions to make (own planning cycle):**
- Backend/BaaS choice: **Supabase** (Postgres + auth + RLS, generous free tier) vs **Clerk** (auth-only, bring your own DB) vs **Firebase** vs **NextAuth + a DB**. Recommendation to evaluate first: **Supabase** (auth + DB + leaderboard queries + RLS in one, fits a Next.js static/edge frontend).
- Sign in / sign up + **Google OAuth**; session/cookie strategy.
- Data model: users, per-user job progress/scores, leaderboard (aggregate scores/ranks).
- **Cookie policy + GDPR/KVKK** compliance (consent banner, data classification, right-to-erasure) — now that we set cookies/store PII.
- Anti-cheat for the leaderboard (scores computed/validated server-side, not trusted from the client).
**Agents (its own docs + Maestro cycle, like the MVP):** `architect` (arch + BaaS decision) → `backend-dev` + `oauth-expert` (auth/OAuth) + `data-modeler` (schema) + `security-reviewer` (session/cookie/anti-cheat) + `compliance-expert` (GDPR/KVKK) → `frontend-dev` (auth UI) → `verifier`.
**Acceptance:** sign in/up + Google works; progress persists per user; leaderboard live + tamper-resistant; cookie policy + consent shipped.

---

## Open decisions to settle at each WS's planning time
- **WS1 Share:** game link vs result card (recommend both).
- **WS4 PL translation:** source/quality owner.
- **WS5 BaaS:** Supabase vs Clerk vs Firebase vs NextAuth (evaluate in WS5 planning).
