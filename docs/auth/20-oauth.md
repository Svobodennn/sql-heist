# OAuth and browser sessions

> **Status:** implemented for the static client-only architecture. Google and GitHub provider configuration and real-provider smoke testing remain operator steps.

## Deployment posture

SQL Heist remains a pure Next.js static export. Authentication runs in the browser through one env-guarded `supabase-js` client:

- no `@supabase/ssr`, middleware, route handler, service-role key, or application server;
- the canonical app callback is `/auth/callback` for email PKCE and OAuth;
- missing public Supabase environment values disable accounts without changing anonymous play;
- RLS and caller-bound RPCs remain the authorization boundary.

This posture necessarily keeps the Supabase session in browser-accessible storage. The repository bans raw HTML injection through lint, and `lib/supabase/client.ts` wraps auth storage to remove Google/GitHub `provider_token` and `provider_refresh_token` values recursively on every write and legacy read. Supabase's own access and refresh tokens remain because the browser client needs them for the authenticated session. If `localStorage` is unavailable, an isolated in-memory adapter is used instead of allowing auth-js to retry unsanitized global storage.

## Email flow

1. `signUpEmail` sends email, password, and the explicitly chosen username metadata to Supabase Auth.
2. The default confirmation email returns to `/auth/callback` with a PKCE `?code=`. A `token_hash` OTP path remains as a template-compatible fallback.
3. The client exchanges or detects the session. `UsernameGate` may auto-submit only the explicit email-signup username metadata.
4. `AuthProvider` loads the own profile through RLS and performs the local/server progress-union handshake.

Passwords must contain at least eight characters including lowercase, uppercase, a digit, and an ASCII symbol in both client validation and the Supabase project policy.

## Google and GitHub flow

1. `OAuthButtons` calls `signInWithOAuth` with the fixed `google` or `github` provider and `${window.location.origin}/auth/callback` as `redirectTo`. Ordinary sign-in adds no provider query parameters. Deletion re-verification forces a provider screen with Google's documented `prompt=consent select_account` or GitHub's `prompt=select_account`; an existing provider SSO session may still avoid a fresh password challenge.
2. Before redirect, the app stores a same-tab OAuth attempt containing only its provider, purpose, an exact allow-listed return path, an optional expected Auth user ID, and a ten-minute expiry. If this state cannot be stored, the flow fails closed before navigation.
3. The provider authenticates the user through Supabase. The provider client secret exists only in Supabase configuration and never in the static bundle.
4. On a completed Google sign-in, the synchronous auth event receives the transient provider credential before the safe storage adapter strips it. The app submits that credential directly to Google's revocation endpoint through a hidden form, removes the token-bearing form immediately, and removes the target frame after 15 seconds. This is best effort because the cross-site browser response is not readable.
5. The existing client callback completes PKCE, consumes the attempt once, and routes only to one of `/`, `/tr`, `/pl`, `/account`, `/tr/account`, or `/pl/account`. Missing, stale, malformed, or mismatched state falls back to `/`.
6. OAuth metadata can prefill a normalized username suggestion, but it is never auto-claimed. The user must explicitly submit it, and the database unique constraint remains authoritative.

No extra provider API scope or downstream Google/GitHub API is requested by application code. SQL Heist uses the identity data Supabase returns for sign-in and never retains provider credentials. Google's transient credential is used only for the immediate revocation request. GitHub grant revocation requires confidential OAuth-app credentials and therefore cannot be performed safely by this static client; the Privacy notice and deletion runbook direct the user to GitHub's Authorized OAuth Apps settings.

## Identity linking

The approved policy is Supabase automatic identity linking when providers return the same verified email. The sign-in/sign-up UI, Privacy notice, and Terms disclose this before provider use. An email/password identity and Google/GitHub identity can therefore resolve to one Auth user instead of creating parallel profiles.

Reference: [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

## Account export and deletion re-verification

The JSON export includes only an allow-listed account/provider identity shape: Auth ID, email and timestamps, provider names, safe user metadata, and identity metadata. Password hashes, Supabase session tokens, and provider access/refresh tokens are excluded.

OAuth-only accounts cannot present a password for deletion. Account settings therefore allow re-authentication with a linked Google or GitHub identity:

- the pre-redirect attempt is bound to the current Auth user ID;
- a successful matching callback creates a one-time receipt lasting two minutes;
- consuming that receipt only opens a fresh confirmation dialog; it never submits deletion automatically;
- the user must retype the username after the provider return and explicitly finish the request while the receipt is valid;
- the database independently requires a `password` or `oauth` AMR timestamp from the last five minutes;
- `request_account_deletion(p_expected_user_id)` rejects unless the current `auth.uid()` equals the account that initiated re-verification, then mutates only that caller. This closes a cross-tab session-switch race between re-verification and the RPC request.

The RPC immediately hides and soft-locks the account. Permanent Auth deletion remains the manual operator procedure in [60-account-deletion-runbook.md](./60-account-deletion-runbook.md).

## Provider configuration and smoke checklist

For each provider:

1. Create the provider OAuth app.
2. Register Supabase's provider callback: `https://dfehphtgtaghuvquhbmr.supabase.co/auth/v1/callback`.
3. Store the client ID and secret in Supabase Authentication provider settings only.
4. Keep the requested identity surface exact: Google `openid`, `.../auth/userinfo.email`, and `.../auth/userinfo.profile`; GitHub `user:email`; pass no application-specific extra scope to `signInWithOAuth`.
5. For Google, configure `https://sqlheist.com` as the production JavaScript origin, publish `https://sqlheist.com/privacy` and `https://sqlheist.com/terms` on the consent screen, and complete the required app name/logo/brand review. Keep the local origin limited to the explicit development client while testing.
6. Use the official current Google button asset/specification and keep Google and GitHub options equally prominent.
7. Enable the provider in Supabase only after its provider/privacy/transfer record is complete.
8. Keep the Supabase redirect allow-list exact: production and local `/auth/callback`, with no wildcard.
9. Smoke-test new sign-in, same-verified-email linking, explicit username confirmation, refresh, sign-out, export, and provider-backed deletion re-verification. For Google, confirm the best-effort revoke POST is emitted and no provider token persists. For GitHub, confirm the published separate-revocation instruction remains accurate.

Official setup references: [Google](https://supabase.com/docs/guides/auth/social-login/auth-google) and [GitHub](https://supabase.com/docs/guides/auth/social-login/auth-github).
