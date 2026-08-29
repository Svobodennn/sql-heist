# Implementation Plan: User Accounts (Supabase, client-only)

> **Status:** P0–P6 implemented and merged. Google and GitHub sign-in/username smoke passed; the provider-specific linking, export, deletion-reauth, token-retention, and revocation checklist remains an external delivery gate. The post-theme normal and explicit env-less static gates were revalidated on 2026-08-29.
> **Scope:** real accounts (email/password plus Google/GitHub), cross-device progress sync, a public "casual" leaderboard, and public profiles — all while the app **stays a static export**.
> **Supersedes for build:** the older design set in [`docs/auth/`](./auth/) (00–40) is a valuable reference but was written against a **stale "levels/jobs" model** (`useProgress.ts`, `level_progress`) that no longer exists, and it recommends an **Edge/SSR + service-role** posture. This plan deliberately overrides both — see [§ Deviations](#deviations-from-docsauth).

## Overview

Add opt-in user accounts to SQL Heist using **client-only `supabase-js` in the browser**, so `output: 'export'` in `next.config.mjs` is preserved and the site keeps deploying as a static `out/`. Anonymous, offline, local-only play stays the **default and fully functional**; signing in unlocks cross-device progress sync, a public leaderboard, and a public profile. **Row-Level Security (RLS) is the entire security boundary** — this app teaches SQL injection, so a leaky policy is a disaster-class bug and gets an explicit review gate before merge.

## Requirements

- Email/password auth with email confirmation (ships first; zero provider config).
- Google + GitHub OAuth in **Phase 6** (the operator provisions the OAuth apps and Supabase provider secrets).
- Client-only Supabase: **no** `@supabase/ssr`, **no** middleware, **no** SSR. `output: 'export'` stays.
- Local-first progress: keep `localStorage` for anonymous play; on login **merge** local → Supabase with **no loss**; then Supabase is the cross-device source of truth.
- Public leaderboard (MVP is client-submitted → cheatable; label it **"casual"**). Server-validated scores via a future Supabase Edge Function are **out of scope** (documented follow-up).
- Public profiles exposing **only safe fields** (never email/PII), opt-in only.
- Full i18n: every new user-facing string keyed in `en`/`tr`/`pl`.
- Strict layering (`app → features → i18n/ui → lib`) and colocation preserved. `lib/engine` + `lib/schema` **untouched**.
- GREEN GATE each phase: `npm run typecheck && npm test && npm run build && npm run test:e2e && npm run lint` — plus linked database lint/advisor review on every DB phase.

## Supabase target (already provisioned)

- Project "Sql Heist", ref `dfehphtgtaghuvquhbmr`, eu-west-1, **Postgres 17**. URL `https://dfehphtgtaghuvquhbmr.supabase.co`.
- Publishable key is new-style `sb_publishable_…` → **public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (gitignored via `.env*.local`).
- The configured Supabase MCP is read-only. Versioned SQL lives in `supabase/migrations/`; linked mutations run through the Supabase CLI, followed by linked database lint and the live adversarial RLS harness.

## Deviations from `docs/auth/`

Each deviation is a deliberate, user-approved product call. Naming them here is the "reject the alternative" record.

| Topic                                | `docs/auth/` recommended                                                | This plan (approved)                                                         | Why                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Front-end posture (open decision #1) | Edge/SSR + `@supabase/ssr`, httpOnly cookies                            | **Static SPA**, session in `localStorage` via `supabase-js`                  | Keeps `output: 'export'`; no server runtime. Compensating XSS control already exists: `dangerouslySetInnerHTML` is lint-banned (`react/no-danger: error`).                                                                                                               |
| Score writes (anti-cheat #4)         | Service-role Edge Function is the **only** writer; clients default-deny | **Client writes its own rows** under RLS `WITH CHECK (auth.uid() = user_id)` | MVP leaderboard is explicitly "casual/cheatable". RLS still blocks writing/reading **other** users' rows. Edge Function = documented follow-up.                                                                                                                          |
| Progress model                       | `level_progress` / `level_id` / `useProgress.ts` (jobs)                 | `case_progress` / `case_id` + `completed_objectives text[]`                  | The shipped game is **cases + objectives** (`useCaseProgress.ts`, key `sql-heist:cases:v1`). The docs' jobs model is stale — `useProgress.ts` no longer exists.                                                                                                          |
| Leaderboard metric                   | `best_score` from `computeJobScore` server-replay                       | **Objectives-cleared count** (what the game actually persists)               | `computeJobScore`/`starsForScore` exist in `lib/engine/scoring.ts` but are **never called** in app/features; no score is persisted today. Ranking by a value we don't measure would be dishonest. `best_score` column is reserved (nullable) for the future score board. |

## Architecture changes (respecting layering + colocation)

```
lib/supabase/                NEW leaf module (below features). Env-guarded browser client singleton.
  client.ts                  getSupabase(): SupabaseClient | null   (null when env missing → auth simply off)
  index.ts

features/auth/               NEW feature. Auth domain: provider, hook, UI. Imports i18n/ui/lib only.
  AuthProvider.tsx           flat module (mirrors i18n/I18nProvider.tsx — non-visual providers stay flat)
  useAuth.ts                 flat hook
  authClient.ts              thin wrappers: signUpEmail / signInEmail / signOut / exchange / verifyOtp
  SignInForm/  SignUpForm/  UserMenu/  UsernameGate/  AuthCard/   (each = X.tsx + X.module.css + index.ts)
  index.ts

features/leaderboard/        NEW feature (P4).
  lib/leaderboardQuery.ts    query helpers over the `leaderboard` view + get_my_rank RPC
  LeaderboardTable/          (colocated component)
  index.ts

features/profile/            NEW feature (P3).
  lib/profileQuery.ts        query helpers over `public_profiles` view + own-profile CRUD
  ProfileView/  AccountPanel/ (colocated components)
  index.ts

features/game/lib/           EXTENDED (P2) — additive, anonymous path byte-identical.
  useCaseProgress.ts         unchanged pure localStorage core kept intact
  progressSync.ts            NEW: fetchServerProgress / pushObjectiveWin / mergeCaseProgress

app/                         Routes (top layer). Client pages; static-export-safe.
  layout.tsx                 wrap children in <AuthProvider> (inside <I18nProvider>)
  auth/sign-in/page.tsx  auth/sign-up/page.tsx  auth/callback/page.tsx   (canonical, non-localized)
  account/page.tsx           own profile + settings + data export + delete (client, auth-gated)
  leaderboard/page.tsx       public board (client fetch)
  u/page.tsx                 public profile by ?name= (client fetch; static-safe, see §static-export note)
  components/Navbar/         EXTENDED: real auth state (UserMenu when in, Sign in when out)

app/[locale]/                P5: /tr /pl variants for leaderboard, account, u (mirrors app/[locale]/cases)
i18n/localeHref.ts           P5: add 'leaderboard','account','u' to LOCALIZED_ROOTS
messages/{en,tr,pl}.json     new namespaces: auth, account, leaderboard, profile (+ nav additions)
```

**Static-export note (load-bearing):** arbitrary usernames cannot be path segments under `output: 'export'` (a dynamic route needs `generateStaticParams` + `dynamicParams=false`; unknown users can't be prerendered). Public profiles therefore use a **query-param route** `app/u/page.tsx` read via `useSearchParams()` and fetched client-side. Leaderboard links point to `/u?name=<username>`. Trade-off: no per-profile prerendered `<meta>` (acceptable for MVP; a future edge runtime could add it — out of scope).

**Session/env guard (keeps e2e green without secrets):** `getSupabase()` returns `null` when `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent (as in the e2e build of `out/`). Every auth surface treats `null` as "auth unavailable": UI hides, sync no-ops, `recordObjectiveWin` stays pure-local. The anonymous `tests/e2e/cases.e2e.ts` flow is untouched.

## Agent Roster

Source: `~/.claude/rules/agent-assignment-matrix.md`. All names verified present in `~/.claude/agents/`.

| Phase                                                       | Ana Agent             | Yedek        | QA Agent(s)                                                     | Parallel With       |
| ----------------------------------------------------------- | --------------------- | ------------ | --------------------------------------------------------------- | ------------------- |
| P0 Foundation (deps, client, provider, base schema+RLS)     | backend-dev           | kraken       | code-reviewer + security-reviewer + database-reviewer           | —                   |
| P1 Email auth core (forms, routes, callback, username gate) | backend-dev           | frontend-dev | code-reviewer + security-reviewer                               | — (needs P0)        |
| P2 Progress sync (game lib extension + merge)               | kraken                | backend-dev  | tdd-guide + verifier + code-reviewer                            | — (needs P0)        |
| P3 Public profiles (view + /u + /account)                   | frontend-dev          | backend-dev  | code-reviewer + security-reviewer + database-reviewer           | P4 (disjoint files) |
| P4 Leaderboard (view + /leaderboard)                        | frontend-dev          | spark        | code-reviewer + security-reviewer + database-reviewer           | P3 (disjoint files) |
| P5 Finish (i18n routes, RLS review gate, PRODUCT.md, legal) | i18n-expert (+ babel) | frontend-dev | **security-reviewer + database-reviewer (RLS GATE)** → verifier | —                   |
| P6 Google/GitHub OAuth                                      | oauth-expert          | backend-dev  | legal review + security review + verifier                       | — (after P5)        |

- **UI-component QA** (SignInForm/UserMenu/LeaderboardTable/ProfileView): add **designer** review for brass-noir fidelity (matrix: React UI → optional designer). Rationale for this deviation: new auth UI is the first account surface players see; visual consistency matters.
- **Plan itself** → **plan-reviewer** before P0 begins (matrix: Plan review).
- **Parallel groups:** P1 and P2 can run concurrently after P0 (P1 = `features/auth` + `app/auth`; P2 = `features/game/lib`). P3 and P4 can run concurrently (disjoint feature dirs) once P0's schema exists; they share only `messages/*` (coordinate string merges). Each parallel task runs its own Dev-QA loop (`qa-loop.md`).

## Database schema + RLS (versioned migrations, applied through the linked CLI)

Principle: **users read/write only their own rows; the public sees only curated, opt-in, safe-column views; base tables are never readable cross-user.** Every table has RLS enabled with explicit policies; absence of a policy = default deny.

**P0 migration — [`20260822220000_auth_core.sql`](../supabase/migrations/20260822220000_auth_core.sql) (tables + own-row RLS + username RPC):** The historical baseline includes the then-current nullable `country` column because the later recorded migrations retire and drop it. The final schema has no country field. Its guards make it a no-op on the already-provisioned production project.

```sql
create extension if not exists citext with schema extensions;

create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  username           extensions.citext unique not null,
  display_name       text,
  country            text,                              -- historical; dropped by 20260824203000
  leaderboard_opt_in boolean not null default false,   -- explicit opt-in; nothing public until true
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint display_name_bounded check (
    display_name is null or char_length(display_name) between 1 and 40
  )
);
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
-- NO delete policy: account deletion is via auth.users cascade, not a client DELETE.

create table public.case_progress (
  user_id              uuid  not null references public.profiles(id) on delete cascade,
  case_id              text  not null,                       -- text id from the case registry (data-driven)
  completed_objectives text[] not null default '{}',         -- mirrors localStorage sql-heist:cases:v1
  best_score           int   check (best_score between 0 and 1200),  -- RESERVED (future score board); unused in MVP
  updated_at           timestamptz not null default now(),
  primary key (user_id, case_id),
  constraint case_id_bounded check (char_length(case_id) between 1 and 64),
  constraint objectives_bounded check (cardinality(completed_objectives) <= 50)
);
alter table public.case_progress enable row level security;
create policy cp_select_own on public.case_progress for select using (auth.uid() = user_id);
create policy cp_insert_own on public.case_progress for insert with check (auth.uid() = user_id);
create policy cp_update_own on public.case_progress for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- NO delete policy (progress is monotonic; deletion cascades from the account).

-- Historical helper. The final hardening migration revokes browser execution;
-- profile INSERT plus the unique constraint is the only collision arbiter.
create function public.username_available(p_username extensions.citext)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select not exists (select 1 from public.profiles where username = p_username);
$$;
grant execute on function public.username_available(extensions.citext) to anon, authenticated;
```

**P3 migration — `public_profiles` view (safe columns, opt-in only):**

```sql
create view public.public_profiles with (security_invoker = false) as
  select p.username, p.display_name, p.created_at,
         coalesce((select sum(cardinality(cp.completed_objectives))::int
                     from public.case_progress cp where cp.user_id = p.id), 0) as objectives_cleared
  from public.profiles p
  where p.leaderboard_opt_in = true;               -- non-opt-in users are invisible
grant select on public.public_profiles to anon, authenticated;
-- Exposes NO id, NO email (email lives only in auth.users), NO opt-out rows.
```

**P4 migration — `leaderboard` view + `get_my_rank` RPC:**

```sql
create view public.leaderboard with (security_invoker = false) as
  select p.username, p.display_name,
         coalesce(sum(cardinality(cp.completed_objectives))::int, 0) as objectives_cleared,
         max(cp.updated_at) as last_active
  from public.profiles p
  left join public.case_progress cp on cp.user_id = p.id
  where p.leaderboard_opt_in = true
  group by p.id, p.username, p.display_name;
grant select on public.leaderboard to anon, authenticated;   -- client ORDERs by objectives_cleared desc, last_active asc

-- Caller's own rank (even outside top-N) without exposing anyone else's identity.
create or replace function public.get_my_rank()
returns table(rank bigint, objectives_cleared int)
language sql stable security definer set search_path = public as $$
  with board as (
    select p.id,
           coalesce(sum(cardinality(cp.completed_objectives))::int,0) as oc,
           max(cp.updated_at) as la
    from public.profiles p
    left join public.case_progress cp on cp.user_id = p.id
    where p.leaderboard_opt_in = true
    group by p.id
  ), ranked as (
    select id, oc, rank() over (order by oc desc, la asc) as rk from board
  )
  select rk, oc from ranked where id = auth.uid();
$$;
grant execute on function public.get_my_rank() to authenticated;
```

### RLS decision (SECURITY-CRITICAL) — the crux, reviewed explicitly in P5

The public leaderboard/profile need to aggregate **across** users, but base-table RLS restricts each caller to their own rows. Two ways to bridge that:

- **Option A (chosen): definer views (`security_invoker = false`) exposing only a curated safe-column list, filtered to `leaderboard_opt_in = true`; base tables stay own-row-only (never readable cross-user).** Attack surface is exactly the view's column list. Supabase's advisor lints definer views (`security_definer_view`) — that finding is **expected**; it is resolved by review sign-off documenting the safe-column list + opt-in filter, not by silencing.
- Option B (rejected): `security_invoker = true` views + broad public SELECT policies on the base tables for opt-in rows. Rejected because RLS is **row-level, not column-level** — a public read policy on `profiles` would expose _every_ column of opt-in rows to `anon`, widening the surface beyond the safe list.

**Non-negotiables enforced + audited in the P5 gate:** RLS enabled on every `public` table; email never leaves `auth.users`; no view/function returns `id` or email; cross-user raw read/write returns zero rows / is denied; `get_advisors` (security + performance) is clean or every finding has a written, reviewed justification.

## Implementation Steps

### Phase 0: Foundation

**Agents:** backend-dev (implement) → code-reviewer + security-reviewer + database-reviewer (QA)
**Parallel:** No — P1–P4 depend on it.
**Goal:** Supabase reachable from the browser, an env-guarded client singleton, a live `AuthProvider`/`useAuth` that reflects session state, and the base schema (`profiles` + `case_progress`) with own-row RLS applied through versioned migrations — with **zero** change to anonymous play.
**Acceptance criteria:**

- `npm run build` still emits static `out/`; `next.config.mjs` `output:'export'` unchanged.
- With env **absent**, `getSupabase()` returns `null`, no console throw, game + anonymous e2e unaffected (GREEN GATE passes with no secrets).
- With env **present** (local `.env.local`), `useAuth()` reports `{ user: null }` initially and updates on `onAuthStateChange`.
- Linked catalog verification shows `profiles` + `case_progress` with RLS enabled; database lint/advisor findings are clean or explicitly reviewed.

1. **Add dependency + env** (Files: `package.json`, `.env.local` [gitignored], `.env.example` [committed])
   - Action: `npm i @supabase/supabase-js`. Add `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`; commit a placeholder `.env.example`.
   - Why: client-only SDK; public keys are `NEXT_PUBLIC_` by design. Risk: Low.

2. **Browser client singleton** (Files: `lib/supabase/client.ts`, `lib/supabase/index.ts`)
   - Signature:
     ```ts
     // lib/supabase/client.ts
     import { createClient, type SupabaseClient } from '@supabase/supabase-js'
     let cached: SupabaseClient | null | undefined
     export function getSupabase(): SupabaseClient | null {
       if (cached !== undefined) return cached // one GoTrueClient only
       const url = process.env.NEXT_PUBLIC_SUPABASE_URL
       const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
       cached =
         url && key
           ? createClient(url, key, {
               auth: {
                 persistSession: true,
                 autoRefreshToken: true,
                 detectSessionInUrl: true,
                 flowType: 'pkce',
               },
             })
           : null // env missing → auth off
       return cached
     }
     ```
   - Why: single cached instance avoids the "Multiple GoTrueClient instances" bug; `flowType:'pkce'` + `detectSessionInUrl` make the static callback work; `null` fallback keeps e2e green. This is a NEW leaf module beside (not inside) the frozen `lib/engine`/`lib/schema` — they are untouched. Risk: Low.

3. **AuthProvider + useAuth** (Files: `features/auth/AuthProvider.tsx`, `features/auth/useAuth.ts`, `features/auth/index.ts`)
   - Signatures:
     ```ts
     interface AuthState {
       user: User | null
       profile: Profile | null
       status: 'loading' | 'anon' | 'authed' | 'disabled'
     }
     interface AuthContextValue extends AuthState {
       signInEmail(email: string, password: string): Promise<{ error?: string }>
       signUpEmail(email: string, password: string, username: string): Promise<{ error?: string }>
       signOut(): Promise<void>
       refreshProfile(): Promise<void>
     }
     export function AuthProvider({ children }: { children: ReactNode }): JSX.Element
     export function useAuth(): AuthContextValue
     ```
   - Action: on mount call `getSupabase()`; if `null` → `status:'disabled'`, render children unchanged. Else `getSession()` + subscribe to `onAuthStateChange`; unsubscribe on unmount. `profile` loaded lazily from `profiles` (own row via RLS).
   - Layering: imports `lib/supabase` + `i18n` only — never `app`. Non-visual provider stays flat (mirrors `i18n/I18nProvider.tsx`). Risk: Medium (session lifecycle) — mitigated by the env guard + single subscription.

4. **Wire provider into the shell** (File: `app/layout.tsx`)
   - Action: wrap `{children}` with `<AuthProvider>` **inside** `<I18nProvider>` so auth UI can translate. `app → features` import is allowed. Risk: Low.

5. **Apply base schema through a versioned migration**
   - Action: snapshot the linked catalog → commit the migration → apply with the linked Supabase CLI → run database lint/advisor review → resolve or annotate findings. Risk: **High** (RLS correctness) — mitigated by database-reviewer QA + the P5 gate re-audit.

6. **Turn the Navbar stub into a live entry point** (Files: `app/components/Navbar/Navbar.tsx`, minimal)
   - Action: replace the `<a href="#wip">` stub with: `status==='authed'` → `<UserMenu/>` (P1 delivers it; P0 may ship a temporary "Sign out" text), else a real `<Link href="/auth/sign-in">` using existing `nav.signIn`. When `status==='disabled'`, hide the entry entirely. Risk: Low.

**Order:** 1 → 2 → 3 → 4 → 5 → 6. **GREEN GATE** (typecheck+test+build+e2e) + advisors clean.

### Phase 1: Email auth core

**Agents:** backend-dev (implement) → code-reviewer + security-reviewer (QA); designer reviews the forms.
**Parallel:** Yes — with Phase 2 (disjoint files: `features/auth` + `app/auth` vs `features/game/lib`).
**Goal:** a player can sign up (email+password+username), confirm via email, sign in, pick/confirm a unique username, see themselves in the Navbar, and sign out — all on static routes, with the anonymous path untouched.
**Acceptance criteria:**

- Sign up → confirmation email → click link → lands on `/auth/callback` → session established → `profiles` row created with the chosen username.
- Duplicate username is rejected gracefully by profile `INSERT` plus the unique constraint (`23505` → re-prompt); private-name availability probing is disabled.
- Session persists across reload/tabs; sign-out revokes it (`supabase.auth.signOut()`).
- All new strings exist in `en`/`tr`/`pl`. Anonymous e2e still green.

1. **Auth client wrappers** (File: `features/auth/authClient.ts`)
   - Signatures: `signUpEmail(email,password,username)` → `supabase.auth.signUp({ email, password, options:{ data:{ username }, emailRedirectTo: <origin>/auth/callback }})`; `signInEmail`, `signOut`, `exchangeCode(code)`. All no-op with a typed error when `getSupabase()` is `null`. Risk: Low.

2. **Sign-in / sign-up UI** (Files: `features/auth/AuthCard/*`, `features/auth/SignInForm/*`, `features/auth/SignUpForm/*`)
   - Action: colocated components (`X.tsx`+`X.module.css`+`index.ts`) built from `.panel` + `.btn`/`.btn--primary`/`.btn--full` + brass tokens. Zod-validate inputs (email, password ≥ configured min, username `^[a-z0-9_]{3,20}$`) before submit; show inline errors. Risk: Medium (form/error states) — mitigated by component tests.

3. **Username gate + profile creation** (Files: `features/auth/UsernameGate/*`, `features/auth/useAuth.ts` `refreshProfile`)
   - Action: after first confirmed sign-in, if no `profiles` row, show `UsernameGate`, then `insert` the row (RLS `profiles_insert_self`). On `23505`, first recover an own row created by another tab; otherwise show inline "taken, try another". Seed only an email-signup username from `user_metadata.username`; OAuth metadata is a suggestion that requires explicit submit. Risk: Medium (collision timing) — the unique constraint is the sole arbiter.
   - Decision (rejected alternative): a `handle_new_user` DB trigger could auto-create the profile, but it moves collision handling server-side where UX is worse; client-side creation keeps the flow visible/testable.

4. **Static callback page** (File: `app/auth/callback/page.tsx` — client, **canonical non-localized URL**)
   - Action: on mount, let `detectSessionInUrl` consume the default-template `?code=` PKCE response via `exchangeCodeForSession`, with one delayed manual exchange fallback in the same browser. Then redirect through the exact stored OAuth return path or `/`. Show a minimal "confirming…" panel plus an error/resend path. Risk: **High** (email-confirm on a static site) — the verifier exists only in the browser that started signup, so the failure copy explicitly covers cross-browser opens.

5. **Routes + Navbar UserMenu** (Files: `app/auth/sign-in/page.tsx`, `app/auth/sign-up/page.tsx`, `features/auth/UserMenu/*`)
   - Action: thin client pages rendering the forms; `UserMenu` shows username + links to `/account`, `/leaderboard`, and Sign out. Risk: Low.

6. **i18n keys** (Files: `messages/{en,tr,pl}.json`)
   - Action: add an `auth` namespace (labels, validation messages, callback states, resend, errors). All three locales. Risk: Low (coverage tested in P5).

**Order:** 1 → 2 → 3 → 4 → 5 → 6. **GREEN GATE.** Manual smoke of the real confirm flow against the live project (needs env).

### Phase 2: Progress sync

**Agents:** kraken (implement, TDD) → tdd-guide + verifier + code-reviewer (QA)
**Parallel:** Yes — with Phase 1 (touches `features/game/lib`, not `features/auth`).
**Goal:** logged-in progress round-trips to Supabase and merges local → server with **no loss**; logged-out/`disabled` behavior is byte-identical to today (golden + e2e stay green).
**Acceptance criteria:**

- On login, local `sql-heist:cases:v1` is unioned into `case_progress` per case; nothing already-cleared is lost either direction.
- New wins while logged in appear on another device after refresh.
- Logged out (or env disabled) → only `localStorage` is touched; `tests/e2e/cases.e2e.ts` + `tests/cases/*.golden.test.ts` pass unchanged.

1. **Sync layer** (File: `features/game/lib/progressSync.ts`)
   - Signatures:
     ```ts
     type CaseProgressMap = Record<string, { objectives: string[] }> // reuse existing type
     export async function fetchServerProgress(): Promise<CaseProgressMap> // select own case_progress
     export async function pushObjectiveWin(caseId: string, objectiveId: string): Promise<void> // upsert union
     export function mergeCaseProgress(
       local: CaseProgressMap,
       server: CaseProgressMap,
     ): CaseProgressMap // pure set-union
     export async function mergeLocalIntoServer(local: CaseProgressMap): Promise<CaseProgressMap> // login handshake
     ```
   - Why merge is safe: completion is **monotonic** (an objective is cleared or not; never un-cleared), so per-case set-union is associative, idempotent, and loss-free — no conflict resolution needed. `mergeCaseProgress` is pure → unit-tested with `mocksmith` fixtures. Risk: Medium — covered by tests.

2. **Extend the read hook** (File: `features/game/lib/useCaseProgress.ts` — additive only)
   - Action: keep `readCaseProgress`/`recordObjectiveWin`/`caseCompletion` **exactly as-is** for anonymous play. The authenticated branch reads the user-scoped cache, fetches server progress, and set-unions the result with the **current** cache again before writing; a win recorded while the fetch is pending therefore cannot be replaced by an older snapshot. When not authed → current behavior verbatim. `ready` still guards hydration. Risk: Medium (hydration/order) — covered by a deferred-fetch concurrent-win regression test.

3. **Login handshake** (File: `features/auth/AuthProvider.tsx`)
   - Action: after the authenticated profile exists, atomically claim anonymous progress into the user-scoped cache and call `mergeLocalIntoServer(claimed)` once. Re-union the response with the current cache and ignore a late response after sign-out/user switch. Risk: Low.

4. **Write-through on win** (File: `features/game/components/CasePlayer/CasePlayer.tsx`, minimal at line ~185)
   - Action: authenticated wins go to `recordAccountObjectiveWin(userId, caseId, objectiveId)`; anonymous/disabled wins keep the original `recordObjectiveWin` path. Authenticated wins also fire-and-forget `pushObjectiveWin` (errors swallowed → play never blocks); a later login retries from the preserved account cache. No engine logic changes. Risk: Medium — mitigated by monotonic union and account isolation.

**Order:** 1 (+tests) → 2 → 3 → 4. **GREEN GATE** — pay special attention to golden + e2e staying green.

### Phase 3: Public profiles

**Agents:** frontend-dev (implement) → code-reviewer + security-reviewer + database-reviewer (QA); designer reviews.
**Parallel:** Yes — with Phase 4 (disjoint feature dirs; coordinate `messages/*` merges).
**Goal:** an opt-in user has a public profile at `/u?name=<username>` exposing only safe fields; the signed-in user manages their own profile at `/account` (edit display name, toggle leaderboard opt-in, export data, request deletion).
**Acceptance criteria:**

- `/u?name=alice` shows Alice's safe public fields **only if** she opted in; otherwise a "private / not found" state (no data leak).
- No email, no `id`, no other user's raw rows are ever fetched by the profile page (verified against RLS + view).
- `/account` edits persist; the consent RPC controls board/profile visibility; "Download my data" yields a safe JSON export; a recently re-authenticated deletion request immediately hides and soft-locks the account, with permanent Auth deletion completed manually within 30 days.

1. **Apply `public_profiles` through a versioned migration** — then run linked lint/advisor review. Risk: **High** (leak surface) — reviewed in P5 gate.
2. **Profile query helpers** (File: `features/profile/lib/profileQuery.ts`)
   - Signatures: `getPublicProfile(username: string): Promise<PublicProfile | null>` (select from `public_profiles`); `getMyProfile()`, `updateMyProfile(patch)`, `setLeaderboardOptIn(bool)`, `exportMyData(): Promise<Blob>`, `deleteMyAccount()`. Risk: Medium.
3. **Public profile page** (Files: `app/u/page.tsx` [client, `useSearchParams`], `features/profile/ProfileView/*`)
   - Action: read `?name=`, fetch via `getPublicProfile`, render safe fields + objectives-cleared. Handle empty/not-found/loading. Static-export-safe (single route, query param). Risk: Medium.
4. **Account page** (Files: `app/account/page.tsx` [client, auth-gated → redirect to `/auth/sign-in` when anon], `features/profile/AccountPanel/*`)
   - Action: edit form, consent-controlled opt-in toggle, safe data export, and recent-auth deletion request. The caller-bound RPC records an idempotent soft lock; the operator deletes `auth.users` under the documented 30-day runbook because no privileged credential may enter the browser. Risk: **High** (erasure correctness) — covered by security/compliance review and the live RLS matrix.
5. **i18n keys** (`messages/{en,tr,pl}.json`): `profile` + `account` namespaces, all three locales.

**Order:** 1 → 2 → 3 → 4 → 5. **GREEN GATE** + advisors clean.

### Phase 4: Leaderboard

**Agents:** frontend-dev (implement) → code-reviewer + security-reviewer + database-reviewer (QA); designer reviews.
**Parallel:** Yes — with Phase 3.
**Goal:** a public, anon-readable "casual" leaderboard ranking opt-in users by objectives cleared, linking each entry to its public profile, with the signed-in user's own rank shown.
**Acceptance criteria:**

- Anonymous visitor can read the board (via the `leaderboard` view granted to `anon`).
- Board shows **only** safe columns; non-opt-in users never appear.
- Signed-in user sees "your rank" via `get_my_rank()`.
- UI carries a visible **"casual — scores are client-submitted"** label (honest, per product decision).

1. **Apply `leaderboard` view + `get_my_rank` through a versioned migration** — then run linked lint/advisor review. Risk: High — P5 gate.
2. **Leaderboard query helpers** (File: `features/leaderboard/lib/leaderboardQuery.ts`)
   - Signatures: `getLeaderboard(limit=50): Promise<LeaderboardRow[]>` (select from view, order client-side by `objectives_cleared desc, last_active asc`), `getMyRank(): Promise<{ rank: number; objectivesCleared: number } | null>`. Risk: Low.
3. **Leaderboard page** (Files: `app/leaderboard/page.tsx` [client], `features/leaderboard/LeaderboardTable/*`)
   - Action: fetch + render ranked rows; each username links to `/u?name=<username>`; render the "casual" label prominently; empty/loading states. Add a board entry point in the Navbar/`UserMenu` and optionally a CTA on the case board. Risk: Low.
4. **i18n keys** (`messages/{en,tr,pl}.json`): `leaderboard` namespace, all three locales.

**Order:** 1 → 2 → 3 → 4. **GREEN GATE** + advisors clean.

### Phase 5: Finish — i18n routes, RLS security review gate, PRODUCT.md, legal

**Agents:** i18n-expert (+ babel) implement i18n; **security-reviewer + database-reviewer run the RLS GATE**; then verifier.
**Parallel:** No — this is the convergence + gate before PR.
**Goal:** localized routes for the new pages, provable i18n coverage, the security review gate passed, and product/legal docs aligned.
**Acceptance criteria:**

- `/tr` and `/pl` variants exist for `leaderboard`, `account`, `u` (auth chrome may stay canonical-en); `localeHref` routes stay in-language.
- An i18n parity test proves `en`/`tr`/`pl` have identical key sets for the new namespaces.
- **RLS GATE passes** (see below) — blocking for merge.
- `PRODUCT.md` + privacy/terms reflect accounts (opt-in, anonymous default preserved, data controller, erasure).

1. **Localized routes** (Files: `app/[locale]/leaderboard/page.tsx`, `app/[locale]/account/page.tsx`, `app/[locale]/u/page.tsx`; edit `i18n/localeHref.ts` `LOCALIZED_ROOTS` += `'leaderboard','account','u'`)
   - Action: mirror `app/[locale]/cases/page.tsx` (re-export the same client feature; localized metadata). `/auth/*` stays canonical (stable redirect-allow-list URL). Risk: Medium — **run `npm run build` after adding routes** (static-export param generation).
2. **i18n parity test** (File: `tests/unit/i18n/authMessages.test.ts`)
   - Action: assert deep key-set equality across `en`/`tr`/`pl` for `auth`/`account`/`leaderboard`/`profile` (+ new `nav`). Risk: Low.
3. **RLS SECURITY REVIEW GATE (blocking)** — security-reviewer + database-reviewer:
   - Re-run `get_advisors('security')` + `get_advisors('performance')`; every finding resolved or justified in writing.
   - Run `tests/security/liveRlsGate.mjs` through the publishable-key Data API plus its management-SQL catalog checks: (a) another user's `profiles`/`case_progress` row is unreadable and immutable; (b) public views/functions expose no UUID/email; (c) non-opt-in users are absent; (d) every `public` base table has RLS; (e) the harness deletes both disposable users in guaranteed cleanup.
   - Sign-off recorded in the PR. **No merge without it.**
4. **Docs + product** (Files: `PRODUCT.md`, `app/[locale]/privacy/*` + `app/privacy` copy, `messages/*`)
   - Action: update `PRODUCT.md` (accounts are opt-in; anonymous/offline stays the default; "nothing leaves your machine unless you sign in"); extend privacy/terms for the data-controller posture, opt-in leaderboard consent, and erasure (align with `docs/auth/30-compliance.md`). Risk: Low.

**Order:** 1 → 2 → (3 gate) → 4. **GREEN GATE** + gate sign-off → open PR.

### Phase 6: Google + GitHub OAuth

**Goal:** add Google/GitHub sign-in and provider-backed deletion re-verification without changing the static deployment or disturbing email auth.
**Acceptance criteria:** OAuth returns through the canonical `/auth/callback`; return paths are exact allow-listed same-origin routes; provider tokens are not retained and a transient Google credential is submitted for immediate best-effort revocation; same-verified-email linking is disclosed; OAuth-only accounts can export and request deletion.

1. **OAuth entry points:** `OAuthButtons` appears on sign-in and sign-up and calls `signInWithOAuth` for `google` or `github`. The callback URL is derived from `window.location.origin` and fixed to `/auth/callback`.
2. **Callback state:** a same-tab `sessionStorage` record stores only provider, purpose, an exact allow-listed return path, optional expected user ID, and a ten-minute expiry. If it cannot be written, OAuth fails closed before navigation. Account-deletion return receipts are one-time, user-bound, and expire after two minutes. Consuming a receipt only opens a fresh confirmation dialog; it never submits deletion automatically. The user must retype the username after the provider return and explicitly finish the request. Deletion re-verification forces the documented provider interaction screen (`consent select_account` for Google; `select_account` for GitHub), while acknowledging that an active provider SSO session may not demand a fresh password.
3. **Account linking and username:** Supabase's automatic linking for identities with the same verified email is the approved policy and is disclosed before provider sign-in. OAuth metadata may suggest a normalized username, but the user must explicitly submit it; only the username explicitly supplied during email signup may be auto-claimed.
4. **Token minimisation:** the app keeps the Supabase access/refresh pair required for the browser session but recursively strips `provider_token` and `provider_refresh_token` on storage writes and legacy reads. If persistent browser storage is unavailable, auth uses isolated in-memory storage instead of falling back to unsanitized global storage. A completed Google sign-in uses its transient credential only to submit an immediate best-effort revoke POST; GitHub grant revocation remains user-controlled because its API requires confidential OAuth-app credentials unavailable to the static client.
5. **Export and deletion:** account export includes a safe allow-list of account/provider identity metadata and excludes session/provider credentials. Deletion accepts a recent password or OAuth AMR proof plus the explicit post-provider confirmation above; its required expected-user argument must equal `auth.uid()` so a cross-tab session switch fails closed. The existing idempotent soft lock/manual permanent deletion workflow remains.
6. **External provider setup:** Google and GitHub apps are configured, their secrets live only in Supabase, and real sign-in plus explicit username selection passed. Before merge, complete and record the remaining real-account matrix: same-email linking, export, deletion reauth, sign-out, token persistence, Google revoke request, and GitHub user-revocation copy.

**Order:** 1 (+tests) → 2 → 3 → 4 → 5 → legal/security review → full GREEN GATE. Real-provider smoke is the only provider-config-dependent gate.

## Testing Strategy

Follows the repo's locked test layout: **source dirs hold zero test files**; everything under `tests/`, subjects imported via `@/`.

- **Unit (Vitest, node)** — the highest-value, deterministic surface:
  - `tests/unit/game/progressSync.test.ts` — `mergeCaseProgress` set-union: empty/local-only/server-only/overlap/idempotency (pure, no network; fixtures via `mocksmith`).
  - `tests/unit/auth/validation.test.ts` — username/email/password Zod validators (format bounds, reserved words).
  - `tests/unit/i18n/authMessages.test.ts` — en/tr/pl key-set parity for new namespaces.
- **Component (Vitest, jsdom)** — `tests/components/SignInForm.test.tsx`, `UsernameGate.test.tsx`, `LeaderboardTable.test.tsx`, `ProfileView.test.tsx`: render + error/empty/loading states with `getSupabase()` mocked and with the **`disabled`** (env-null) branch (auth UI hidden).
- **E2E (Playwright)** — keep `tests/e2e/cases.e2e.ts` **unchanged and green** (anonymous path is the regression guard). Add `tests/e2e/auth-anon.e2e.ts` asserting that with **no** Supabase env in the `out/` build, the game plays and no auth UI errors surface. Full signed-in journeys (confirm-email, sync) are **manual/staging** smoke against the live project (they need real email + secrets; do not gate CI on them).
- **DB/RLS (linked CLI + Data API)** — `tests/security/liveRlsGate.mjs` creates two disposable confirmed users, exercises the adversarial matrix against the real project, and guarantees cleanup. It runs only with `RUN_LIVE_RLS_GATE=1`.
- **Mock vs real:** unit/component tests mock Supabase for pure logic and UI; RLS is tested against the **real** project because policies cannot be meaningfully mocked. No CI e2e requires account secrets.

## Risks & Mitigations

- **RLS leak (SECURITY-CRITICAL).** This app teaches SQLi; a policy hole is disaster-class.
  - Mitigation: RLS on every table; own-row policies with `WITH CHECK`; public data only through curated definer views (safe columns + opt-in filter); base tables never cross-user readable; `get_advisors` on every DB phase; **blocking** P5 adversarial review; email confined to `auth.users`.
- **Progress-merge data loss.** A bad merge could wipe a device's clears.
  - Mitigation: completion is monotonic → per-case **set union** (associative, idempotent, loss-free); every async response is re-unioned with the current user-scoped cache before writing; never overwrite server with empty local; pure merge plus deferred-fetch concurrent-win behavior are unit/component tested.
- **Email-confirm / OAuth redirect on a static site.** No server to handle the callback; the PKCE `code_verifier` and email token must round-trip client-side.
  - Mitigation: single client `/auth/callback` page using `detectSessionInUrl` + `exchangeCodeForSession`; the live default template and exact redirect allow-list use same-browser PKCE `?code=`. The callback ships a resend/error path and does not accept a separate `token_hash` flow.
- **Cheatable leaderboard.** Client-only writes mean a user can inflate **their own** rows.
  - Mitigation: accepted for v1 and **labeled "casual"** in UI; RLS still blocks writing/reading other users' rows; `best_score` bounded by CHECK; documented follow-up = a Supabase **Edge Function** doing server replay (the `docs/auth/40-anti-cheat.md` design) — out of scope here.
- **Session persistence / multiple clients.** Duplicate `GoTrueClient` instances corrupt session state.
  - Mitigation: one cached singleton in `lib/supabase/client.ts`; `persistSession`+`autoRefreshToken`; a single `onAuthStateChange` subscription in `AuthProvider`.
- **e2e/CI without secrets.** Missing env at build must not break the static site or the anonymous suite.
  - Mitigation: `getSupabase()` returns `null` → `status:'disabled'` → auth UI hidden, sync no-ops, localStorage path byte-identical; new e2e asserts exactly this.
- **Full i18n coverage.** Missed keys ship raw identifiers.
  - Mitigation: parity test (P5); every phase adds keys to all three locales as part of its own gate; `translate.ts` already falls back to `en` then the key.
- **Static-export breakage.** Route/CSS-module moves and dynamic segments silently break only at build.
  - Mitigation: **always `npm run build`** after adding routes/CSS modules (per CLAUDE.md); public profiles use a **query param**, not a path segment (no arbitrary `dynamicParams` under `output:'export'`).
- **Layering / colocation drift.** A `features → app` import or an un-foldered component violates conventions.
  - Mitigation: Supabase client in `lib/`, auth domain in `features/auth/`, routes in `app/`; each visual component in its own folder; enforced by code-reviewer + lint.
- **Compliance (data controller).** Accounts make us a controller (GDPR/KVKK).
  - Mitigation: opt-in leaderboard (`leaderboard_opt_in default false`); data export + erasure in `/account`; privacy/terms updated in P5; posture aligned with `docs/auth/30-compliance.md`. Deep legal items remain **[verify with counsel]**.

## Success Criteria

- [x] `output:'export'` unchanged; every phase passes `npm run typecheck && npm test && npm run build && npm run test:e2e`.
- [x] Anonymous `tests/e2e/cases.e2e.ts` + golden suite stay green throughout (no secrets needed).
- [x] Email sign-up → confirm → sign-in → unique username → Navbar reflects auth → sign-out works.
- [ ] Google/GitHub sign-in → callback → explicit username choice is implemented and basic provider smoke passed; the real-account linking, export, deletion-reauth, sign-out, token-retention, Google revoke-request, and GitHub revocation-copy matrix remains an external delivery gate.
- [x] On login, local progress merges into `case_progress` with zero loss; a win syncs across devices.
- [x] Public leaderboard is anon-readable, opt-in only, safe columns only, labeled "casual"; "your rank" works.
- [x] `/u?name=` shows opt-in public profiles only; non-opt-in is invisible; no email/`id`/cross-user data is exposed.
- [x] `/account` edits profile, toggles opt-in, exports data, and creates a verified deletion soft lock; permanent deletion is completed through [`docs/auth/60-account-deletion-runbook.md`](./auth/60-account-deletion-runbook.md).
- [x] RLS security gate passed (advisors clean/justified + adversarial cross-user matrix) and was recorded for delivery.
- [x] New pages are localized for `/tr` and `/pl`; i18n parity tests are green.
- [x] `PRODUCT.md` + privacy/terms updated; `lib/engine`/`lib/schema` untouched.

## Branching & delivery

- **Branch:** `auth-accounts` was delivered through PR #1 and merged into `main`; the post-auth OAuth follow-up is also present in the theme branch's verified `main` base. Cinematic Breach integration is isolated on `cinematic-breach-theme`.
- **Commits:** one scoped commit per logical phase; `type(scope): desc` (English, lowercase, single line, **no** AI trailer); get explicit approval before each commit/push.
- **PR:** the auth PR completed after the P5 RLS gate. Any future theme or auth follow-up PR still requires fresh explicit approval and a concise "what & why" body (no test-plan/boilerplate/AI note).

## Open items to confirm at build (`[verify]`)

1. **Resolved:** Supabase's default confirm-signup template produces same-browser PKCE `?code=` links; the live email flow passed and `/auth/callback` intentionally has no `token_hash` branch.
2. **Resolved:** client-only settings create a caller-bound, recent-auth soft lock; permanent Auth deletion is an operator action under `docs/auth/60-account-deletion-runbook.md`. No service-role credential or Edge Function is shipped.
3. **Resolved:** GoTrue and client Zod both require 8+ characters with `a-z`, `A-Z`, `0-9`, and an ASCII symbol. Leaked-password screening remains unavailable on the Hobby plan.
4. Supabase **region/KVKK transfer basis** for the eu-west-1 project (compliance, counsel).
