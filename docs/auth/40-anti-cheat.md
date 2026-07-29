# WS5 — Leaderboard Anti-Cheat

> **Status:** DESIGN ONLY. Grounded in the current engine (`lib/engine/*`, `lib/schema/level.ts`) and scoring (`lib/engine/scoring.ts`), all verified by reading source.
> Enforced at the data layer by RLS default-deny writes ([10 §5](./10-schema.md)).

---

## 1. Threat model: what is forgeable, what is not

A leaderboard is only meaningful if a score cannot be minted by editing client state. Split the score into its parts:

| Signal | Where it comes from today | Server-verifiable? |
|---|---|---|
| **The win** (did the payload solve the level) | `openLevel(level).run(inputs)` → `evaluate(winCondition)` — **deterministic** | ✅ **Yes** — replay it |
| `actualTimeSec` (time bonus) | client clock | ❌ No — unless server measures it |
| `failedRuns` (attempt penalty) | client counter | ❌ No — unless server proxies runs |
| `openedHintTiers` (hint penalty) | client counter | ❌ No — unless server records opens |

**Crucial asymmetry:** the **win is objectively replayable**, because each level builds a *fresh in-memory SQLite DB* from `level.database.schemaSql` + `seedSql` (no randomness — plain `INTEGER PRIMARY KEY`, no `AUTOINCREMENT`), runs the composed template against the player's `inputs`, and checks a pure `winCondition`. The **score metadata is the only cheatable surface**, and every metadata field can *only lower* the score (`scoring.ts`: penalties subtract, time bonus is `max(0, …)`). So the **ceiling of any cheat is a legit perfect run** (base 1000 + max time bonus 200 = **1200**). We defend that ceiling.

> **Golden fact:** the engine already runs headless in Node (the `tests/levels/*.golden.test.ts` suite drives `createSqlEngine → init → openLevel → run` under vitest). Server-side replay therefore reuses **the exact same frozen engine** — zero client/server divergence risk. This is the single most important reason the anti-cheat is tractable.

## 2. Recommended model: server replay + server-authoritative time

**Never trust a score from the client. Trust only a payload, then recompute.**

```
① Level start
   client ─▶ verify-fn: startLevel(levelId)   (authenticated, JWT)
   verify-fn: mint a signed, single-use START TOKEN
              { userId, levelId, nonce, startedAt(server clock) }  → store nonce
   returns token to client

② Play locally (unchanged UX: instant in-browser sql.js feedback, offline-friendly)

③ Win claim
   client ─▶ verify-fn: submitWin({ startToken, levelId, inputs, clientMeta })
   verify-fn:
     a. AUTH: valid JWT? token.userId == auth.uid()? nonce unused? not expired?
     b. REPLAY: load SERVER-OWNED level JSON (NOT from client);
                openLevel(level).run(inputs); evaluate(winCondition).
                not won → reject (write score_events{verified:false}, no leaderboard).
     c. TIME:  server_time_sec = now() − token.startedAt   (server clock, client time ignored)
     d. META:  clamp client attempts/hints to sane bounds (0..3 hints, attempts ≥ replay-seen);
               these only reduce score, so worst case = an honest perfect run.
     e. SCORE: recompute with the SAME pure computeJobScore() (shared module),
               using server_time_sec + clamped meta.  ← authoritative
     f. WRITE (service role, bypasses RLS): upsert level_progress (max-score-wins),
               append score_events{verified:true, server_time_sec, payload_hash}.
```

Why each piece:
- **Server owns the level content** → a cheater cannot swap in a trivial level; they can only send `levelId` + `inputs`.
- **Server replay** → the win is unforgeable; a fabricated "I won" with a non-winning payload is rejected.
- **Server-authoritative time** (start token) → kills the biggest cheat (claiming ~0 s for max time bonus). Token is **signed, short-TTL, single-use, bound to (user, level, nonce)** so it can't be minted late or reused.
- **Shared `computeJobScore`** → the score formula has one source of truth (the existing pure module), reused server-side; no drift.
- **RLS default-deny writes** ([10 §5](./10-schema.md)) → the verify-fn (service role) is the *only* writer to `level_progress`/`score_events`.

### Residual gap (be honest)
`failedRuns` / `openedHintTiers` remain **client-reported** in this model. Because both only *subtract*, the exploit is "claim a flawless run" — bounded to the legit max (1200) and only reachable by someone who *did* produce a genuinely winning payload under the server-measured time. For a **teaching game**, that residual is acceptable. Closing it fully requires §3.

## 3. Alternatives / knobs (trade-offs)

| Model | Integrity | UX / cost | Verdict |
|---|---|---|---|
| **Replay + server time** (recommended) | High for win+time; meta trusted-but-bounded | Best UX (local play intact); one replay per *win* | ✅ MVP default |
| **Full run-proxy** (every attempt goes to the server; server counts attempts/hints) | Highest — attempts/hints become authoritative | Breaks offline/instant feedback; N× latency + cost; server runs all SQL | ⚠️ only if meta-integrity is proven necessary |
| **Signed score token** (verify-fn signs `{user,level,score,ts}`; leaderboard accepts only signed) | Equivalent to RLS-service-role write | Extra crypto plumbing; RLS already gives this for free | 🟡 redundant with RLS default-deny |
| **Trust client, no replay** | None | Cheapest | ❌ leaderboard is meaningless |

**Rate limiting & idempotency (apply in all models):**
- One **leaderboard-eligible** submission per `(user, level)`; best-score-wins upsert → resubmission can't inflate, only improve legitimately.
- Rate-limit `submitWin` per user/IP (e.g. small N/min **[verify tuning]**) to stop brute-forcing payload/meta space.
- **Idempotency key** = the single-use start-token nonce → a replayed HTTP request can't double-write.
- **Email-verified before eligibility** ([20 §2](./20-oauth.md)) → raises the cost of sock-puppet farms.

## 4. Premortem — failure modes of the replay function

| Risk | Sev | Mitigation |
|---|---|---|
| **Replaying user SQL is literally injection** on the server | med | It runs in an **ephemeral in-memory sql.js sandbox** — no network, no host FS, discarded after each call (same isolation as the browser). Not a host risk. |
| **DoS via pathological payload** (huge `UNION`, cartesian blowup) | **high** | Per-request **wall-clock timeout**, **row cap**, **memory cap** on the sandbox; reject over-limit as "not a valid solution." |
| **Start-token forgery / reuse** to fake fast time | high | Signed (server secret), short TTL, **single-use nonce** stored server-side, bound to `(user, level)`. |
| **Engine divergence** client vs server | low | Reuse the **frozen** engine (proven in Node golden tests); pin the version. |
| **Level content drift** changes what "winning" means across versions | med | Version the level content; stamp `score_events` with a level content hash; decide leaderboard comparability across versions (open). |
| **Runtime mismatch** (sql.js WASM in Deno Edge Functions can be fiddly) | med | Prefer a **Node serverless function importing the existing engine** (Node compatibility is proven by the test suite); treat Supabase Edge/Deno as an alternative **[verify feasibility]**. |

## 5. Where the verify-fn lives

Given the engine's proven Node compatibility, the pragmatic host is a **Node serverless function** (e.g. Vercel Function / Cloudflare Worker with nodejs-compat **[verify]**) that imports the frozen engine + `computeJobScore`, and writes to Supabase via the **service role key** (server-only secret). This is the same "thin serverless verification layer" named in the deployment-model change ([00 §0](./00-decision.md)).

---

## OPEN DECISIONS — WS5 cycle

Consolidated across all five docs. Each needs an owner + a call before build.

1. **Front-end posture:** keep pure static SPA (`localStorage` session) **vs** move to edge runtime (`@supabase/ssr`, httpOnly cookies). Drives [20](./20-oauth.md) and the whole deployment model. *(Lead: Edge/SSR, per the httpOnly requirement.)*
2. **BaaS confirm:** ratify Supabase over Clerk/Firebase/NextAuth ([00](./00-decision.md)); managed vs self-hosted.
3. **Data residency & KVKK transfer basis:** Supabase region (EU?) vs self-host in TR/EU; confirm cross-border lawful basis + VERBİS/DPA **[verify with counsel]** ([30 §8](./30-compliance.md)).
4. **Anti-cheat depth:** replay + server-time (recommended) **vs** full run-proxy (attempts/hints authoritative). Integrity vs UX/cost ([40 §3](#3-alternatives--knobs-trade-offs)).
5. **Verify-fn runtime:** Node serverless (reuse frozen engine, proven) **vs** Supabase Edge/Deno **[verify]**.
6. **Leaderboard scope:** per-level, global-total, or both; regional/friends boards later ([10 §4](./10-schema.md)).
7. **Leaderboard identity:** real username vs mandatory pseudonym; profanity filter; opt-in default (recommended OFF) ([30 §3](./30-compliance.md)).
8. **Analytics?** — determines minimal cookie *notice* vs full consent *banner* ([30 §4](./30-compliance.md)).
9. **Anonymous → account import:** auto vs prompt; discard-vs-keep local; re-validate old scores (recommended) ([20 §6](./20-oauth.md)).
10. **Email verification gate** before leaderboard eligibility (recommended ON).
11. **Level-version comparability:** how scores compare when a level's content changes; store content hash in `score_events`?
12. **Preserve anonymous/offline as first-class default** (recommended YES — keeps the "nothing leaves your machine" promise unless the user opts in).
13. **Rate-limit thresholds** + abuse response policy for `submitWin`.
