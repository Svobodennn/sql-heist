# WS5 — Cookie Policy, GDPR & KVKK

> **Status:** DESIGN ONLY — posture and requirements, **not legal advice**. Legal specifics marked **[verify]** must be confirmed with counsel; KVKK/GDPR details evolve (cutoff 2026-01).
> The moment we ship accounts, **we become a data controller** ([00 §0](./00-decision.md)). This doc scopes the resulting duties.

---

## 1. Roles

- **Controller:** the SQL Heist operator (decides why/how personal data is processed).
- **Processor:** Supabase (+ any host/analytics). **Sign the Supabase DPA** and record sub-processors **[verify]**.
- **KVKK note:** the operator is *"veri sorumlusu"*; Supabase is *"veri işleyen."* If processing meets KVKK thresholds, VERBİS registration may apply **[verify with counsel]**.

## 2. Data classification (what we hold)

| Data | Source | PII? | Sensitivity | Notes |
|---|---|---|---|---|
| Email | sign-up / Google | **Yes** | Medium | in `auth.users` only; not mirrored to `public` |
| Google `sub` / OAuth id | Google | **Yes** (pseudonymous id) | Medium | identifier, not content |
| `username` / `display_name` | user-chosen | **Yes if identifying** | Low–Med | public **only** when `leaderboard_opt_in=true`; pseudonym allowed |
| Progress / scores / stars | gameplay | Personal data (linked to account) | Low | not special-category |
| Winning-payload **hash** | anti-cheat | Low | Low | we store a hash, not the raw injection string ([10 §3.3](./10-schema.md)) |
| IP address | request logs / rate-limit | **Yes** (GDPR) | Low–Med | security purpose; short retention |
| Session cookies | auth | contain identifiers | — | strictly necessary ([20](./20-oauth.md)) |

**No special-category data** (GDPR Art. 9 / KVKK "özel nitelikli"): no health, biometrics, beliefs, etc. Keep it that way — do not collect more than email + handle + game state. **Data minimisation is a design constraint, not a nicety.**

## 3. Lawful basis (per purpose)

| Purpose | GDPR basis | KVKK basis | Rationale |
|---|---|---|---|
| Account + cross-device sync | **Art. 6(1)(b)** contract | contract / açık rıza | user requested an account to sync progress |
| Session/auth cookies | **strictly necessary** (ePrivacy exemption) | zorunlu çerez | required to deliver the requested login |
| Public leaderboard (username + score) | **Art. 6(1)(a) consent** (opt-in) | **açık rıza** | publishing a handle publicly should be an explicit choice, revocable |
| Security logs / rate-limiting (IP) | **Art. 6(1)(f)** legitimate interest | meşru menfaat | abuse prevention; balancing test on file |
| Analytics (if any) | **consent** | açık rıza | non-essential → requires opt-in banner |

**Key stance:** the leaderboard is **opt-in** (`leaderboard_opt_in` defaults `false`, [10 §3.1](./10-schema.md)); consent is granular and **withdrawable** (leaving the board = flip the flag, row disappears from the aggregate).

## 4. Cookie policy & consent banner

Because the only cookies we *need* are the **strictly-necessary session cookies**, the banner requirement depends on whether we add non-essential cookies:

- **If we ship NO analytics/marketing cookies (recommended for MVP):** a **cookie notice** (informational, in the privacy policy + a small link) suffices — **no consent gate** for strictly-necessary auth cookies. This is the cleanest posture and keeps the offline/anonymous default friction-free.
- **If analytics/marketing are added:** a **full consent banner** is required, meeting EDPB/KVKK expectations **[verify]**:
  - Granular categories (necessary always-on; analytics/marketing opt-in).
  - **"Reject all" as easy as "Accept all"** (equal prominence, same layer).
  - **No pre-ticked boxes**, no consent before action, **no cookie wall**.
  - Consent logged with timestamp + version; re-prompt on policy change; easy withdrawal.
  - KVKK: pair with an *aydınlatma metni* (privacy notice) presented before/at collection.

**Deliverables regardless:** a **Privacy Policy** and a **Cookie Policy** page (EN + TR given KVKK/audience), listing each cookie, purpose, and lifetime; link both from the auth screens and footer.

## 5. Data-subject rights & flows

| Right (GDPR / KVKK) | How we satisfy it |
|---|---|
| **Access** | in-app "Download my data" → JSON export of `profiles` + `level_progress` (+ email from `auth.users`) |
| **Rectification** | edit `display_name`/`username` in profile settings |
| **Erasure / "right to be forgotten"** | self-serve "Delete my account" (see §6) |
| **Portability** | the same JSON export (structured, machine-readable) |
| **Objection / withdraw consent** | toggle `leaderboard_opt_in` off (leave the board); withdraw analytics consent |
| **Restriction** | flag account to suspend processing pending a dispute |

Respond within **GDPR 1 month** (extendable) / **KVKK "en kısa sürede", ≤30 days** **[verify]**.

## 6. Right-to-erasure flow

```
User → "Delete my account" (requires re-auth)
  1. Soft-lock the account (block new writes), show a short grace/undo window (optional).
  2. Delete auth.users row  ──cascade──▶ profiles ──cascade──▶ level_progress, score_events
     (single-point deletion via on-delete-cascade, [10 §5]).
  3. Row vanishes from the leaderboard automatically (it's an aggregate over deleted rows).
  4. Purge/anonymise PII (IP) from security logs on the normal log-retention cycle.
  5. Backups: PII persists in backups until they rotate out — DOCUMENT this (see §7);
     re-deletion is applied if a backup is ever restored.
  6. Confirm completion to the user in-app + by email.
```
- **Erasure vs. audit:** `score_events` is deleted with the user (it's personal data). If an anonymised anti-cheat signal must survive, keep only a **non-identifying aggregate** (e.g. counts), never the `user_id` or payload hash. Decide in WS5.

## 7. Retention

| Data | Retention | Trigger |
|---|---|---|
| Account + progress | while account is active | deletion on user request |
| Inactive accounts | proposal: **delete after 24 months** inactivity (notify first) **[verify]** | scheduled job |
| Security logs (IP) | **30–90 days** then purge/anonymise | rolling window |
| Backups / PITR | vendor window (e.g. ~**7–30 days** **[verify]**) | rotation; erasure propagates as backups age out |
| Consent records | duration of processing + limitation period **[verify]** | account deletion + N |

## 8. Cross-border transfer & residency (KVKK-critical)

- The user base / operator is Turkey-oriented → **KVKK cross-border transfer rules apply** to using a non-TR BaaS **[verify with counsel]**. Recent KVKK amendments moved toward adequacy/appropriate-safeguards/explicit-consent bases — confirm the current lawful transfer route **[verify]**.
- **Region choice:** host the Supabase project in an **EU region** for GDPR posture **[verify available regions]**; if counsel requires **in-country** data, use **self-hosted Supabase** in a TR/EU region ([00 §4 flip](./00-decision.md)).
- Maintain a **RoPA** (records of processing) and a transfer-basis note. This region/transfer-basis decision is a WS5 open item ([40 §open](./40-anti-cheat.md)).
