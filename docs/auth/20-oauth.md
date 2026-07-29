# WS5 — Auth Flows, Sessions & Cookies

> **Status:** DESIGN ONLY. Provider assumed = Supabase GoTrue (per [00-decision](./00-decision.md)). Flows/cookie names below are the standard Supabase model; confirm exact SDK behaviour at build time **[verify]**.

---

## 1. Two front-end postures (this is a real fork)

The brief says "static/edge." Those are **different** deployment models with different session mechanics, and the choice is coupled to the httpOnly-cookie requirement:

| | **Static SPA** (keep `output: 'export'`) | **Edge/SSR** (Next.js middleware on Vercel/Cloudflare) |
|---|---|---|
| Session storage | Access + refresh tokens in **`localStorage`** (supabase-js default) | Tokens in **httpOnly cookies** via `@supabase/ssr` |
| OAuth callback | Handled **client-side** (`exchangeCodeForSession`) | Handled by an **edge route handler / middleware** |
| httpOnly cookies? | ❌ not possible (no server to set them) | ✅ yes |
| XSS token theft risk | Higher — tokens are JS-readable | Lower — refresh token never reaches JS |
| Keeps pure static export | ✅ | ❌ (adds an edge runtime) |

**Recommendation:** because (a) the brief explicitly wants **httpOnly cookies + refresh**, and (b) an OAuth redirect callback already wants a server-side landing point, adopt the **Edge/SSR posture**: Next.js on an edge runtime (Vercel Edge or Cloudflare) with `@supabase/ssr` setting httpOnly cookies. Keep the **static-SPA + `localStorage`** model documented as the fallback if we must remain pure-static — with a **strict CSP + no `dangerouslySetInnerHTML`** (already a frontend rule) as the compensating control. This static-vs-edge call is the first WS5 open decision ([40 §open](./40-anti-cheat.md)).

> Either way, a server-side function now exists in the stack — see the deployment-model change in [00 §0](./00-decision.md).

## 2. Sign-up / sign-in (email + password)

```
Sign-up
  form (email, password, username) ──▶ supabase.auth.signUp()
     ├─ GoTrue creates auth.users row (unconfirmed)
     ├─ sends verification email (magic link)
     └─ on first confirmed sign-in: create public.profiles row (username, opt_in=false)

Sign-in
  form (email, password) ──▶ supabase.auth.signInWithPassword()
     └─ issues access JWT (~1h) + refresh token
```
- **Email verification required before leaderboard eligibility** (anti-spam) — open decision, recommended ON.
- **Password policy** delegated to GoTrue (min length, breach check if available **[verify]**).
- `profiles.username` chosen at sign-up; uniqueness enforced by the `citext unique` constraint ([10 §3.1](./10-schema.md)); collision → ask again.

## 3. Google OAuth (PKCE, public client)

The browser is a **public client** (no client secret) → **PKCE** flow. Google client secret lives in the **Supabase project config**, never in the frontend bundle.

```
1. User clicks "Continue with Google"
      supabase.auth.signInWithOAuth({ provider:'google',
        options:{ redirectTo: <app callback URL>, scopes:'email profile' }})
2. Browser ─▶ Google consent screen (email, profile)
3. Google ─▶ Supabase callback  https://<ref>.supabase.co/auth/v1/callback
4. Supabase exchanges the Google code, mints its own session, then
   redirects to the app's redirectTo with a one-time  ?code=...  (PKCE)
5. App exchanges code for a session:
      • Static SPA : supabase.auth.exchangeCodeForSession()  (client, code_verifier from localStorage)
      • Edge/SSR   : edge route handler runs the exchange and Set-Cookie (httpOnly)  ← recommended
6. First-ever Google sign-in → create public.profiles (username seeded from Google name, editable)
```
- **Scopes:** `email profile` only — no Drive/Contacts/etc. (data minimisation, [30](./30-compliance.md)).
- **`redirectTo` allow-list:** register exact callback URLs in Supabase; reject open redirects.
- **Account linking:** if a Google email matches an existing email/password account → linking policy is an open decision (auto-link vs. prompt). Default: prompt, to avoid takeover.

## 4. Session & cookie strategy (Edge/SSR posture)

`@supabase/ssr` writes the session as httpOnly cookies (names like `sb-<ref>-auth-token`, possibly chunked) **[verify]**. Target attributes:

| Cookie | httpOnly | Secure | SameSite | Path | Max-Age / expiry | Notes |
|---|---|---|---|---|---|---|
| Access token (JWT) | ✅ | ✅ | **Lax** | `/` | ~**1 h** (JWT `exp`) | short-lived; carries `auth.uid()` used by RLS |
| Refresh token | ✅ | ✅ | **Lax** | `/` | days–weeks, configurable **[verify]** | **rotated on every use** by GoTrue; reuse-detection revokes the family |
| PKCE `code_verifier` (transient) | ✅ | ✅ | **Lax** | `/` | until callback | must survive the top-level redirect from Google |

**Why `SameSite=Lax` (not Strict):** the Google→app OAuth return is a top-level cross-site GET; the `code_verifier`/session cookies must ride along on that navigation. `Strict` can drop cookies on that return and break the callback. `Lax` allows top-level GET while still blocking cross-site POST — the right balance. **[verify]** exact behaviour per browser.

**Refresh model:** access JWT is short (limits blast radius if leaked); the refresh token is httpOnly, rotates on use, and edge middleware silently refreshes before `exp`. The frontend JS **never** sees the refresh token in this posture.

**CSRF:** `SameSite=Lax` blocks the common CSRF vector. State-changing calls (score submit) additionally carry the access JWT as a bearer and are verified by the anti-cheat function ([40](./40-anti-cheat.md)); consider a double-submit token if any cookie-authenticated POST is added later.

**Sign-out:** clear cookies + call `supabase.auth.signOut()` (revokes the refresh token server-side so a stolen copy dies).

## 5. How the frontend "holds" the session per posture

- **Edge/SSR (recommended):** the browser holds only httpOnly cookies (opaque to JS). Edge middleware validates/refreshes on each request and exposes the user to server components; client components learn auth state via a lightweight `/whoami` or an `onAuthStateChange` bridge. RLS keys off the JWT's `sub` = `auth.uid()`.
- **Static SPA (fallback):** supabase-js keeps the session in `localStorage`, auto-refreshes, and fires `onAuthStateChange`. Simpler, offline-friendly, but XSS-exfiltratable → **hard-require CSP + no raw HTML injection** as the mitigation.

## 6. Anonymous → account migration (one-time import)

Existing players have local progress (`sql-heist:progress:v1`). On first sign-in, offer a **one-time import**: read the local map, submit each completed level to the anti-cheat function for **re-validation** (we do not trust the old client scores blindly — see [40](./40-anti-cheat.md)), and upsert `level_progress` with **max-score-wins** conflict resolution. Import policy (auto vs. prompt, discard vs. keep local) is an open decision.
