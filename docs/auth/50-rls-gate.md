# P5 RLS security gate

Date: 2026-08-24
Project: `dfehphtgtaghuvquhbmr` (`eu-west-1`, Postgres 17)
Result: **PASS**

This is the blocking pre-merge review for the browser-accessible Supabase surface. It records the live schema and adversarial checks without retaining API keys, access tokens, passwords, disposable emails, or user UUIDs.

## Live schema review

- The harness enumerates the live catalog rather than a hard-coded subset. Every
  ordinary table in `public` is expected and has RLS enabled: `profiles`,
  `case_progress`, and `profile_consent_events`.
- Base-table policies are limited to own-row checks using `auth.uid()`; grants
  independently narrow which of those policies are reachable through the Data API.
- Direct browser delete privileges are revoked from both `profiles` and
  `case_progress`. Direct insert/update privileges are also revoked from
  `case_progress`, making its caller-bound RPC the sole browser write path.
- `profile_consent_events` grants browser clients only own-row `select`; insert,
  update, delete, and sequence access are revoked.
- `public_profiles` exposes exactly `username`, `display_name`, `country`, `created_at`, and `objectives_cleared`.
- `leaderboard` exposes exactly `username`, `display_name`, `country`, `objectives_cleared`, and `last_active`.
- Neither public view exposes a profile UUID or auth email.
- `get_my_rank()` and `request_account_deletion()` use `SECURITY DEFINER` with `search_path=pg_catalog`.
- `set_public_profile_consent(boolean, text)` uses `SECURITY DEFINER` with
  `search_path=pg_catalog`, accepts no target user, and is the only browser path
  that can update `leaderboard_opt_in`.
- `username_available(citext)` uses `SECURITY DEFINER` with the explicit `search_path=public, extensions` required for the `citext` type.
- `upsert_case_progress(text, text[])` uses `SECURITY DEFINER` with
  `search_path=pg_catalog`, accepts no target user, and performs an atomic,
  retry-safe set union for the authenticated caller. It validates 1–64 character
  case/objective IDs, accepts at most 50 objectives per call/case, and permits at
  most 100 case rows per account.
- Public-profile consent evidence is capped at 100 ordinary state transitions per
  account. Granting fails closed at the limit; withdrawal remains available.
- `supabase db lint --linked --schema public --level warning --fail-on error` reported no schema errors.

## Adversarial matrix

The live test used two disposable, confirmed Auth users. It executed 114 assertions
through the same publishable-key Data API surface used by the static browser app.
The reproducible harness is [`../../tests/security/liveRlsGate.mjs`](../../tests/security/liveRlsGate.mjs)
and requires the explicit guard:

```bash
RUN_LIVE_RLS_GATE=1 node tests/security/liveRlsGate.mjs
```

| Boundary                       | Verified result                                                                                                                                                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile creation               | A user can insert its own profile; a second user cannot insert it on the first user's behalf.                                                                                                                                                                                             |
| Base profile reads             | A user can read its own row; another authenticated user and anon receive no row.                                                                                                                                                                                                          |
| Profile writes                 | Allowed own fields update; cross-user updates return no row; `username`, `leaderboard_opt_in`, and `delete_requested_at` cannot be written directly by the browser.                                                                                                                       |
| Profile deletion               | Cross-user and direct own-profile deletes are denied/no-op; rows remain intact.                                                                                                                                                                                                           |
| Progress reads/writes          | Own progress reads succeed; direct own/cross-user/anon insert, update, and delete paths are denied as applicable. Anon receives no row and cannot invoke the RPC.                                                                                                                         |
| Progress merge and bounds      | Repeated `upsert_case_progress` calls preserve the sorted union without loss or duplication. Invalid/oversized identifiers, more than 50 objective entries, and a 101st case row are rejected; an existing case still merges at the row limit.                                            |
| Public profiles                | Only an explicitly opted-in user appears, through the five-column curated shape. A private user remains absent.                                                                                                                                                                           |
| Leaderboard                    | Only an explicitly opted-in user appears, through the five-column curated shape. A private user remains absent.                                                                                                                                                                           |
| Opt-in boundary                | Public opt-in does not grant cross-user access to the underlying profile row.                                                                                                                                                                                                             |
| Consent evidence               | Only the audited RPC can grant or withdraw public-profile consent. The browser cannot forge, alter, or delete events; another user and anon cannot read them. Events include trusted database time, notice version, purpose, and source.                                                  |
| Consent retry/version behavior | Same-state retries create no duplicate event; stale grants fail closed; stale clients may always withdraw. Turning opt-in off removes the user from both public views immediately. A new grant is rejected after 100 state-change events while withdrawal remains available.              |
| Consent caller binding         | The RPC accepts no target UUID and changes only `auth.uid()`; a second authenticated user could not change or read the first user's consent state.                                                                                                                                        |
| Rank RPC                       | Anon is denied; an opted-in caller receives only `rank` and `objectives_cleared`; a private caller receives no row.                                                                                                                                                                       |
| Username RPC                   | Anon is denied; an authenticated caller receives only the availability boolean.                                                                                                                                                                                                           |
| Deletion RPC                   | A recently password-authenticated caller can request deletion only for itself; the request atomically withdraws public consent, records one deletion-source event, and blocks subsequent profile and progress writes. Retries preserve the original timestamp without duplicate evidence. |

Both disposable Auth users were deleted in a guaranteed cleanup step. A final
catalog query found zero matching Auth users, profiles, progress rows, and consent
events.

## Advisor review

The live performance advisor returned no findings. The security advisor returned seven intentional findings:

1. `public.public_profiles` — `security_definer_view`
2. `public.leaderboard` — `security_definer_view`
3. `public.get_my_rank()` — authenticated `SECURITY DEFINER` execution
4. `public.request_account_deletion()` — authenticated `SECURITY DEFINER` execution
5. `public.set_public_profile_consent(boolean, text)` — authenticated `SECURITY DEFINER` execution
6. `public.upsert_case_progress(text, text[])` — authenticated `SECURITY DEFINER` execution
7. `public.username_available(citext)` — authenticated `SECURITY DEFINER` execution

These findings are accepted for this design:

- The two views must aggregate across own-row RLS boundaries, but publish only reviewed safe columns from explicitly opted-in, non-deleting profiles. The matrix verified both the column boundary and opt-in/opt-out behavior.
- `get_my_rank()` must rank across the private aggregate, but is not executable by anon and returns only the caller's rank/count pair.
- `request_account_deletion()` takes no target identifier, binds its operation to `auth.uid()`, requires recent password authentication, and immediately withdraws public visibility and locks browser writes.
- `set_public_profile_consent(boolean, text)` takes no target identifier, binds
  its operation to `auth.uid()`, rejects stale grants, permits stale withdrawal,
  caps ordinary state changes, and atomically records consent evidence.
- `upsert_case_progress(text, text[])` takes no target identifier, binds every
  write to `auth.uid()`, validates bounded inputs, serializes per-user quota
  checks, respects the deletion soft-lock, and is the only browser progress
  mutation path.
- `username_available(citext)` is restricted to authenticated users and returns one boolean. Anonymous account-existence probing is denied.

Changing either public view's columns/filter, any RLS policy, any listed function's return type/body/grants/search path, or the account-deletion write path invalidates this sign-off and requires the live matrix to be rerun.

## Application dependency audit

The 2026-08-24 review upgraded Next.js to `15.5.23`, ESLint's matching Next
configuration to `15.5.23`, and Vitest to the patched `3.2.6` line. Safe npm
remediations were applied. The Vitest critical advisory and the unrelated
transitive YAML/glob findings no longer appear.

`npm audit --omit=dev --audit-level=high` now reports zero critical/moderate
findings and three linked high findings: the Next.js package record plus its
fixed-only-in-a-major PostCSS and Sharp dependencies. npm's supported remediation
is Next.js `16.3.2`, a framework-major migration.

The remaining findings are accepted for this static deployment until that
dedicated migration:

- `next.config.mjs` exports only static files (`output: 'export'`) and disables
  the image optimization server (`images.unoptimized: true`); no Node.js Next
  server is deployed.
- The repository has no `next/image` imports, and Sharp's affected path requires
  processing untrusted image input. The build processes only version-controlled
  repository assets.
- PostCSS runs only during the trusted build over version-controlled styles. The
  project does not accept user-supplied CSS or source maps into its build.

This acceptance becomes invalid if a server runtime is introduced, image
optimization is enabled, or untrusted CSS/images/source maps enter the build.
Next.js 16 remains a separate framework migration because forcing it inside the
account feature would also change the lint/build toolchain.
