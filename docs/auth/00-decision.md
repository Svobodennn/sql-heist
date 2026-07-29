# WS5 — Auth, Progress Sync & Leaderboard: BaaS Decision Brief

> **Status:** DESIGN ONLY — planning artifact for a later Maestro (WS5) cycle. No code, no build.
> **Scope:** accounts, cross-device progress sync, and a global/per-level leaderboard.
> **Sibling docs:** [10-schema](./10-schema.md) · [20-oauth](./20-oauth.md) · [30-compliance](./30-compliance.md) · [40-anti-cheat](./40-anti-cheat.md)
> Numbers marked **[verify]** are version/quota/legal specifics that drift — confirm at build time (knowledge cutoff 2026-01).

---

## 0. The load-bearing fact: this breaks the "no backend" model

SQL Heist today is **100% client-side static**, and that is an explicit product promise, not an accident:

- `next.config.mjs` → `output: 'export'` — `next build` emits a static `out/`, **no server runtime**.
- Progress lives in `localStorage` (`features/game/lib/useProgress.ts`, key `sql-heist:progress:v1`).
- Scoring is a **pure client-side** module (`lib/engine/scoring.ts`); the SQLite engine runs in-browser via `sql.js` WASM.
- The README markets it as: *"no real target, no backend, and no network; nothing leaves your machine."*

**Auth + progress sync + leaderboard cannot be delivered inside that model.** All three require durable, shared, server-authoritative state:

| Capability | Why it forces a backend |
|---|---|
| Accounts / sign-in | Identity + credential/session verification must live server-side. |
| Cross-device progress sync | A shared store of record; `localStorage` is per-device by definition. |
| Leaderboard | Aggregated, cross-user data; and scores **must be validated server-side** (see [40-anti-cheat](./40-anti-cheat.md)) or the board is meaningless. |

### Deployment-model change (state this to stakeholders)

```
BEFORE (today)                          AFTER (WS5)
────────────────                        ─────────────────────────────────
Static out/  ──▶ any CDN                Static/edge frontend  ──▶ CDN/edge
(no secrets, no DB, no ops)                    │
                                               ├─▶ Auth (OAuth callback, session)
                                               ├─▶ Serverless verify fn (anti-cheat replay)
                                               └─▶ Managed Postgres + RLS (BaaS)
                                        + secrets, a DB to operate, backups,
                                        + GDPR/KVKK data-controller obligations
```

Two consequences that are easy to under-scope:
1. **A server-side function becomes mandatory** — for the OAuth callback / httpOnly cookies ([20-oauth](./20-oauth.md)) **and** for score replay ([40-anti-cheat](./40-anti-cheat.md)). Pure static export can no longer cover the whole app. The realistic topology is *static/edge frontend + a thin serverless verification layer + a BaaS*.
2. **We become a data controller** — email, OAuth identifiers, IP in logs → GDPR/KVKK obligations begin ([30-compliance](./30-compliance.md)).

**Design principle to preserve the product's ethos:** anonymous, offline, local-only play stays the **default and fully functional**; the account + cloud sync + leaderboard is **opt-in**. "Nothing leaves your machine" remains true unless the player chooses to sign in.

---

## 1. Options evaluated

- **Supabase** — managed Postgres + GoTrue auth + PostgREST + Edge Functions; RLS is native Postgres.
- **Clerk** — auth/identity specialist (great UX, orgs, MFA); **no database** — you still bring your own.
- **Firebase** — Firebase Auth + Firestore (NoSQL) + Cloud Functions; security via Firestore Rules.
- **NextAuth (Auth.js) + self-managed DB** — auth library that runs *inside* a Next.js server runtime; you own the DB (Postgres/Neon/etc.).

## 2. Decision table

Legend: ✅ strong · 🟡 workable/with caveats · ❌ weak for this project.

| Criterion | Supabase | Clerk | Firebase | NextAuth + DB |
|---|---|---|---|---|
| **Auth (email + Google OAuth)** | ✅ GoTrue, PKCE, providers built in | ✅ best-in-class UX, MFA, orgs | ✅ mature, providers built in | 🟡 solid, but you wire providers + adapters yourself |
| **Database (relational progress)** | ✅ Postgres, first-class | ❌ none — pair with a DB | 🟡 Firestore NoSQL; relational modelling awkward | 🟡 your choice, but you provision + operate it |
| **Leaderboard queries (rank/aggregate)** | ✅ SQL `rank()`/window fns, views, indexes | ❌ n/a | 🟡 no server-side aggregate rank; denormalize + count shards | 🟡 full SQL if Postgres, but all hand-rolled |
| **Row security (RLS)** | ✅ native Postgres RLS | n/a (no data) | 🟡 Firestore Rules (separate rule language) | 🟡 app-layer or Postgres RLS you configure |
| **Free tier** | ✅ generous free project **[verify]** | 🟡 free MAU cap, paid scales fast **[verify]** | ✅ Spark plan **[verify]** | 🟡 free lib; you pay for hosting + DB |
| **Fit with static/edge Next.js** | ✅ external service; frontend can stay static; SSR helper for edge | ✅ client SDK works with static | ✅ client SDK works with static | ❌ **requires a Next.js server runtime → forces dropping `output: 'export'`** |
| **Vendor lock-in** | 🟡 low-ish — it's **open-source & self-hostable**; standard Postgres | 🟡 auth data portable; UX/session proprietary | ❌ high — Firestore data/query model is proprietary | ✅ lowest — you own everything |
| **GDPR/KVKK posture** | ✅ DPA + EU regions; self-host option for residency **[verify]** | ✅ DPA, EU data option **[verify]** | 🟡 Google DPA; data-residency/ transfer scrutiny | ✅ you control region entirely (you also own all duties) |

## 3. Lead recommendation

**Supabase.** One managed service gives us Postgres + auth + **native RLS** in a single place, so the leaderboard's `rank()` queries, the per-user "read only your own rows" policy, and the account system share one relational store — no second vendor, no NoSQL impedance mismatch, and it keeps the frontend static/edge instead of forcing a server runtime the way NextAuth does.

**One-line rationale:** *Postgres + auth + RLS in one box maps 1:1 onto "users read their own progress, everyone reads an aggregate leaderboard," while letting the frontend stay static/edge.*

## 4. What would flip the choice

| If this becomes true… | …flip to |
|---|---|
| We need drop-in enterprise auth UX (orgs, MFA, SSO) with minimal effort | **Clerk** for auth, **paired** with Supabase/Neon Postgres for scores (two vendors accepted). |
| Team is already all-in on Firebase, wants realtime NoSQL, and doesn't value SQL ranking/RLS | **Firebase**. |
| Hard requirement to self-host / avoid managed vendors, and we accept running a server (drop static export) | **Self-hosted Postgres + NextAuth** — or **self-hosted Supabase** (softens lock-in without abandoning the model). |
| Turkey/EU **in-country data residency** is mandated by counsel | **Self-hosted Supabase** in a TR/EU region (see [30-compliance §residency](./30-compliance.md)). |

**Non-negotiables regardless of vendor:** (a) scores are **server-validated** before they touch the leaderboard ([40-anti-cheat](./40-anti-cheat.md)); (b) clients can **never write** to score/leaderboard tables directly (RLS default-deny; writes go through a verified serverless function); (c) anonymous local play stays the default.
