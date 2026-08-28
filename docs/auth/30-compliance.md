# WS5 — Cookie Policy, GDPR & KVKK

> **Status:** DESIGN ONLY — posture and requirements, **not legal advice**. Legal specifics marked **[verify]** must be confirmed with counsel; KVKK/GDPR details evolve (cutoff 2026-01).
> The moment we ship accounts, **we become a data controller** ([00 §0](./00-decision.md)). This doc scopes the resulting duties.

> **2026-08-28 implementation note:** this file predates the shipped case-based,
> client-only design and remains historical reference only. Current product truth lives
> in [`../auth-plan.md`](../auth-plan.md), the public Privacy/Terms pages, the live
> [`50-rls-gate.md`](./50-rls-gate.md), and
> [`60-account-deletion-runbook.md`](./60-account-deletion-runbook.md). In particular,
> the current build has no analytics, marketing cookies, `level_progress`, or server-side
> score events. Browser-only Google/GitHub OAuth is implemented and configured; real sign-in
> plus explicit username selection passed, while the remaining provider-specific smoke matrix
> in [`../auth-plan.md`](../auth-plan.md) is still an external delivery gate.

## Current provider readiness

Provider duties are split between the already-live anonymous/contact surface and the
planned account release. Cloudflare and Vercel already receive ordinary site requests,
and Microsoft already receives messages sent to the published contact address, so their
unresolved duties are current-production remediation rather than account-launch tasks.
Supabase account processing must not be deployed until its remaining transfer and legal
requirements are complete. Technical RLS completion does not resolve these duties.

| Provider / duty             | Current status                                                                                                                                                                                                           | Required action / deadline                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel                      | **Blocked:** Hobby (free); the published Vercel processor DPA expressly applies only to Pro and Enterprise                                                                                                               | Remediate the current production host now: move to a DPA-covered arrangement (for example, reviewed Cloudflare Pages self-serve) or obtain qualified approval for another documented data-role basis          |
| Supabase                    | **Provider contract recorded:** Free use accepts the Terms of Service; those Terms incorporate the current DPA, which is effective with the Agreement                                                                    | Retain the versions below and complete the separate KVKK transfer mechanism before optional accounts are deployed                                                                                             |
| Cloudflare                  | **Provider contract recorded:** the Free self-serve relationship is governed by the Self-Serve Subscription Agreement, which incorporates the current DPA                                                                | Retain the versions below and complete the KVKK transfer mechanism for the current proxy/request processing now                                                                                               |
| Microsoft Outlook / Hotmail | **Blocked:** Free consumer mailbox under the Microsoft Services Agreement/Privacy Statement; no customer processor DPA or Türkiye-specific transfer arrangement was identified                                           | Remediate the current published contact channel now: move to a DPA-covered mailbox or obtain qualified approval and document the provider's role plus transfer mechanism                                      |
| Google OAuth                | **Configured; basic smoke passed:** static sign-in requests only `openid`, `userinfo.email`, and `userinfo.profile`; provider tokens are not retained and the client submits an immediate best-effort revocation request | Complete the remaining same-email linking, export, deletion-reauth, sign-out, token-retention, and revoke-request smoke checks; retain provider role/retention/transfer evidence                              |
| GitHub OAuth                | **Configured; basic smoke passed:** Supabase requests `user:email`; provider tokens are not retained, but grant revocation requires confidential OAuth-app credentials and is not available to the static client         | Complete the remaining linking, export, deletion-reauth, sign-out, token-retention, and revocation-copy smoke checks; retain public user-controlled revocation instructions and provider evidence             |
| KVKK international transfer | **Blocked:** no adequacy decision, Türkiye standard contract, signature, or notification has been documented for the recurring provider transfers                                                                        | Document the lawful route now for current host/proxy/contact transfers and before account launch for Supabase; if using a standard contract, sign the official form and notify KVKK within five business days |
| GDPR Article 27             | **Blocked pending facts:** the `/pl` service can indicate offering a service to people in the EU; the operator's EEA establishment and representative/exception analysis have not been recorded                          | Resolve territorial scope for the current service now; if Article 3(2) applies without an EEA establishment or exception, appoint an EU representative and publish its identity/contact before proceeding     |

### Provider contract review record (2026-08-24)

This record is based on the providers' official current text, not a claim that the
remaining Türkiye transfer duties have been completed:

- **Supabase:** [Terms of Service](https://supabase.com/terms) take effect when the
  service is accepted or used and incorporate the Data Processing Addendum. The
  current [DPA](https://supabase.com/legal/customer-resources/data-processing-addendum)
  is Version 1 dated 2026-08-01 and states that it forms part of, and is effective
  with, the Agreement. It includes EU SCCs, but that does not by itself evidence
  completion of the separate Türkiye mechanism.
- **Cloudflare:** the
  [Self-Serve Subscription Agreement](https://www.cloudflare.com/terms/) governs Free
  Services and incorporates the DPA in section 6.1. The current
  [DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) is version 6.4,
  effective 2026-04-03.
- **Vercel:** the [DPA](https://vercel.com/legal/dpa), last updated 2026-03-17,
  expressly limits processor coverage to Pro and Enterprise customers. Hobby is
  governed by the [Terms of Service](https://vercel.com/legal/terms), whose Hobby
  section permits only personal/non-commercial use; SQL Heist is free, but the
  missing processor DPA remains the issue for end-user request data.
- **Microsoft:** Outlook.com/Hotmail is a consumer service under the
  [Microsoft Services Agreement](https://www.microsoft.com/servicesagreement) and
  [Privacy Statement](https://www.microsoft.com/privacy/privacystatement). The
  Privacy Statement describes Microsoft processing email content and international
  storage; it is not a customer processor DPA for this mailbox. It also states that a
  deleted item generally remains in Deleted Items for approximately seven days and,
  after that folder is emptied, in Microsoft's systems for up to 30 more days unless
  legally required longer.
- **KVKK:** the Authority's
  [standard-contract notice](https://www.kvkk.gov.tr/Icerik/8170/) says the official
  text must be signed by the transfer parties without substantive alteration and
  notified to the Authority within five business days. For controller-to-processor
  transfers, the relevant published form is Standard Contract 2.
- **GDPR territorial scope:** EDPB
  [Guidelines 3/2018](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en.pdf)
  treat language and service-targeting facts as relevant and include a Turkish website
  offering services in EU languages as an Article 3(2) example. If that scope applies,
  GDPR Article 27 generally requires a written EU representative unless a documented
  exception applies.

Store dated copies or hashes of the accepted provider versions in the private operator
compliance record now for active providers and before account launch for Supabase,
together with account identity/contact details and subprocessor-notification
subscriptions. Do not place private account records or signatures in this repository.

Current consent implementation is limited to the optional public profile/leaderboard.
The account and progress-sync service uses the contract/service-delivery basis described
in the public Privacy notice; it is not bundled into the public-profile consent.

Current retention decision: public-profile consent events remain linked to the account
while it exists and are erased with the account. After deletion, the operator keeps only
the pseudonymous completion evidence described in
[`60-account-deletion-runbook.md`](./60-account-deletion-runbook.md): a keyed HMAC of the
Auth UUID plus request/completion/deadline/confirmation times, with operator-only access
and deletion no later than 90 days after completion. No consent-event row, email,
username, or raw account UUID is retained. The older proposal below to retain consent
rows for an additional limitation period is not implemented.

Messages sent to the published contact address are handled in the free Microsoft
Outlook.com/Hotmail mailbox. The working retention rule is deletion within 12 months
after a support or privacy thread closes, unless a mandatory legal period or active
claim requires longer retention; in that case deletion follows when that period or
claim ends. Rights requests involving correspondence are verified and handled manually.
The public Privacy notice discloses the correspondence fields, purposes, provider, bases,
and retention. The Microsoft arrangement remains a current-production remediation
blocker in the table above.

---

## 1. Roles

- **Controller:** the SQL Heist operator (decides why/how personal data is processed).
- **Processors/providers:** Supabase plus the current host, proxy, and correspondence provider, subject to provider-specific role analysis. The current Supabase DPA is incorporated into its Terms; retain version evidence and record subprocessors **[verify remaining provider roles]**.
- **KVKK note:** the operator is _"veri sorumlusu"_; Supabase is _"veri işleyen."_ If processing meets KVKK thresholds, VERBİS registration may apply **[verify with counsel]**.

## 2. Data classification (what we hold)

| Data                                          | Source                    | PII?                              | Sensitivity    | Notes                                                                                                   |
| --------------------------------------------- | ------------------------- | --------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| Email                                         | sign-up / Google / GitHub | **Yes**                           | Medium         | in `auth.users` only; not mirrored to `public`                                                          |
| Provider account id and safe profile metadata | Google / GitHub           | **Yes** (pseudonymous id)         | Medium         | identity metadata only; exported through an allow-list                                                  |
| Provider access/refresh token                 | Google / GitHub callback  | **Yes**                           | High/transient | stripped before persistence; Google credential is used only for an immediate best-effort revoke request |
| `username` / `display_name`                   | user-chosen               | **Yes if identifying**            | Low–Med        | public **only** when `leaderboard_opt_in=true`; pseudonym allowed                                       |
| Completed case/objective ids                  | gameplay                  | Personal data (linked to account) | Low            | monotonic progress only; raw SQL practice payloads are not synced                                       |
| IP address                                    | request logs / rate-limit | **Yes** (GDPR)                    | Low–Med        | security purpose; short retention                                                                       |
| Supabase browser session                      | auth                      | contains identifiers              | —              | strictly necessary local storage; safe adapter removes provider credentials ([20](./20-oauth.md))       |

**No special-category data** (GDPR Art. 9 / KVKK "özel nitelikli"): no health, biometrics, beliefs, etc. Keep it that way — do not collect more than email + handle + game state. **Data minimisation is a design constraint, not a nicety.**

## 3. Lawful basis (per purpose)

| Purpose                                         | GDPR basis                                  | KVKK basis           | Rationale                                                            |
| ----------------------------------------------- | ------------------------------------------- | -------------------- | -------------------------------------------------------------------- |
| Account + cross-device sync                     | **Art. 6(1)(b)** contract                   | contract / açık rıza | user requested an account to sync progress                           |
| Supabase session in browser storage             | **strictly necessary** (ePrivacy exemption) | zorunlu depolama     | required only after the user requests persistent sign-in             |
| Public leaderboard (username + objective count) | **Art. 6(1)(a) consent** (opt-in)           | **açık rıza**        | publishing a handle publicly should be an explicit choice, revocable |
| Security logs / rate-limiting (IP)              | **Art. 6(1)(f)** legitimate interest        | meşru menfaat        | abuse prevention; balancing test on file                             |
| Analytics (if any)                              | **consent**                                 | açık rıza            | non-essential → requires opt-in banner                               |

**Key stance:** the leaderboard is **opt-in** (`leaderboard_opt_in` defaults `false`, [10 §3.1](./10-schema.md)); consent is granular and **withdrawable** (leaving the board = flip the flag, row disappears from the aggregate).

## 4. Browser storage notice & future consent gate

The current application code sets no analytics, advertising, or marketing cookies. It uses `localStorage` for locale, local/account progress, the notice acknowledgement, an expiring pending signup address, and the necessary Supabase session after sign-in; OAuth return state uses expiring same-tab `sessionStorage`.

- **Current build:** `CookieConsent` is an informational, dismissible storage notice, not consent for optional processing. The Privacy notice records the keys, purpose, and lifetime; no account or game feature is blocked behind acceptance.
- **If analytics/marketing are added:** a **full consent banner** is required, meeting EDPB/KVKK expectations **[verify]**:
  - Granular categories (necessary always-on; analytics/marketing opt-in).
  - **"Reject all" as easy as "Accept all"** (equal prominence, same layer).
  - **No pre-ticked boxes**, no consent before action, **no cookie wall**.
  - Consent logged with timestamp + version; re-prompt on policy change; easy withdrawal.
  - KVKK: pair with an _aydınlatma metni_ (privacy notice) presented before/at collection.

**Current deliverable:** the localized Privacy notice and root storage notice cover application-owned storage. Reassess provider-set cookies and add a separate cookie policy before introducing any non-essential storage.

## 5. Data-subject rights & flows

| Right (GDPR / KVKK)                   | How we satisfy it                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Access**                            | in-app "Download my data" → JSON export of safe account/identity metadata, `profiles`, `case_progress`, and consent history |
| **Rectification**                     | edit `display_name`; username is an immutable account identifier, with manual rights handling available through Contact     |
| **Erasure / "right to be forgotten"** | self-serve verified soft-lock followed by the operator deletion runbook (see §6)                                            |
| **Portability**                       | the same JSON export (structured, machine-readable)                                                                         |
| **Objection / withdraw consent**      | toggle `leaderboard_opt_in` off; no analytics consent exists in the current build                                           |
| **Restriction**                       | contact the operator to request restriction; the deletion soft-lock is not presented as a general restriction workflow      |

Respond within **GDPR 1 month** (extendable) / **KVKK "en kısa sürede", ≤30 days** **[verify]**.

## 6. Right-to-erasure flow

```
User → "Delete my account" (requires re-auth)
  1. Record an idempotent soft lock that blocks new writes and immediately removes public visibility.
  2. The operator verifies the request, records pseudonymous completion evidence, then deletes auth.users.
  3. auth.users deletion ──cascade──▶ profiles ──cascade──▶ case_progress, profile_consent_events.
  4. The row stays absent from the leaderboard throughout the request and deletion.
  5. Purge/anonymise PII (IP) from security logs on the normal log-retention cycle.
  6. Backups: PII persists in backups until they rotate out — DOCUMENT this (see §7);
     re-deletion is applied if a backup is ever restored.
  7. Confirm completion through the verified contact channel.
```

- **Erasure evidence:** no account/profile/progress/consent row survives. The operator retains only the keyed-HMAC completion record described above for at most 90 days; it contains no raw account UUID, email, or username.

## 7. Retention

| Data               | Retention                                                                   | Trigger                                         |
| ------------------ | --------------------------------------------------------------------------- | ----------------------------------------------- |
| Account + progress | while account is active                                                     | deletion on user request                        |
| Inactive accounts  | proposal: **delete after 24 months** inactivity (notify first) **[verify]** | scheduled job                                   |
| Security logs (IP) | **30–90 days** then purge/anonymise                                         | rolling window                                  |
| Backups / PITR     | vendor window (e.g. ~**7–30 days** **[verify]**)                            | rotation; erasure propagates as backups age out |
| Consent records    | while the account exists; erased by the account cascade                     | permanent account deletion                      |
| Deletion evidence  | no later than 90 days after completion                                      | operator runbook purge deadline                 |

## 8. Cross-border transfer & residency (KVKK-critical)

- The user base / operator is Turkey-oriented → **KVKK cross-border transfer rules apply** to using a non-TR BaaS **[verify with counsel]**. Recent KVKK amendments moved toward adequacy/appropriate-safeguards/explicit-consent bases — confirm the current lawful transfer route **[verify]**.
- **Region choice:** host the Supabase project in an **EU region** for GDPR posture **[verify available regions]**; if counsel requires **in-country** data, use **self-hosted Supabase** in a TR/EU region ([00 §4 flip](./00-decision.md)).
- Maintain a **RoPA** (records of processing) and a transfer-basis note. This region/transfer-basis decision is a WS5 open item ([40 §open](./40-anti-cheat.md)).
