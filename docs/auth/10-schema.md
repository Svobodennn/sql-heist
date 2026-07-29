# WS5 — Data Model & RLS Sketch

> **Status:** DESIGN ONLY. SQL below is an **illustrative sketch** for the decision brief, not migration code. Target: Supabase (Postgres). Auth identities live in the Supabase-managed `auth.users`; everything below is in `public`.
> Back to [00-decision](./00-decision.md) · anti-cheat context in [40-anti-cheat](./40-anti-cheat.md).

---

## 1. Mapping from today's client state

The server model must absorb — not replace — the existing client shapes:

| Today (client) | Field | Server home |
|---|---|---|
| `useProgress.ts` `JobRecord` | `completed: boolean`, `bestScore: number` | `level_progress.completed`, `level_progress.best_score` |
| `scoring.ts` `JobProgress` | `failedRuns`, `openedHintTiers`, `actualTimeSec` | `level_progress.attempts`, `hints_used`, `best_time_sec` (+ `score_events` audit) |
| `starsForScore()` | 1..3 | `level_progress.stars` |
| level JSON `id` (`front-door`/`vault`/`blueprint`) | string | `level_progress.level_id` |

`level_id` is the **text** id from the level JSON (not a numeric FK) so content stays data-driven and the server doesn't need a `levels` mirror table just to satisfy a foreign key. Score comparability across level edits is an open item — see [40 §open](./40-anti-cheat.md).

## 2. Entities

```
auth.users (managed by Supabase)
   │ 1:1
   ▼
profiles ─────1:N────▶ level_progress ─────1:N────▶ score_events (append-only audit)
   │                        │
   └── leaderboard_opt_in   └── best_score, stars, best_time_sec, attempts, hints_used
                                     │
                                     ▼ (aggregate, read-only)
                              leaderboard  (VIEW / function, not a base table)
```

## 3. Tables (sketch)

### 3.1 `profiles` — 1:1 with `auth.users`
```sql
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  username           citext unique not null,          -- public handle (may be a pseudonym)
  display_name       text,
  leaderboard_opt_in boolean not null default false,   -- explicit opt-in; see 30-compliance
  country            text,                              -- optional, for regional boards (open)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
```
- **Keys/idx:** PK `id`; `unique(username)` (citext = case-insensitive). Enforce a `citext` extension + a format/profanity check on `username` at the app/function layer.
- **PII:** `username`/`display_name` are user-chosen and public **only** when `leaderboard_opt_in = true`. Email stays in `auth.users`, never mirrored here.

### 3.2 `level_progress` — per-user, per-level best (source of record for sync)
```sql
create table public.level_progress (
  user_id           uuid  not null references public.profiles(id) on delete cascade,
  level_id          text  not null,                    -- 'front-door' | 'vault' | 'blueprint' | ...
  completed         boolean not null default false,
  best_score        int   not null default 0 check (best_score between 0 and 1200),
  stars             smallint check (stars between 1 and 3),
  best_time_sec     int   check (best_time_sec >= 0),
  attempts          int   not null default 0 check (attempts >= 0),
  hints_used        smallint not null default 0 check (hints_used between 0 and 3),
  first_completed_at timestamptz,
  updated_at        timestamptz not null default now(),
  primary key (user_id, level_id)
);

create index level_progress_board_idx
  on public.level_progress (level_id, best_score desc, updated_at);
```
- **`best_score` bound `0..1200`** mirrors `scoring.ts` clamp (`minScore` 100 … `base` 1000 + `timeBonusCap` 200). The DB check is a cheap backstop; the real guard is server recompute ([40](./40-anti-cheat.md)).
- **PK `(user_id, level_id)`** = one best row per level per user; upsert on improvement.
- **Board index** serves per-level top-N without a full scan.

### 3.3 `score_events` — append-only audit / anti-cheat ledger
```sql
create table public.score_events (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  level_id        text not null,
  score           int  not null,
  verified        boolean not null,                    -- did server replay confirm the win?
  server_time_sec int,                                 -- server-measured duration (not client)
  payload_hash    text,                                -- hash of inputs, NOT raw payload (privacy)
  created_at      timestamptz not null default now()
);
create index score_events_user_level_idx on public.score_events (user_id, level_id, created_at desc);
```
- Enables replay/audit, anomaly detection, and "best score" reconstruction. **We store a hash of the winning payload, not the raw injection string**, to avoid retaining more user input than needed (data minimisation, [30](./30-compliance.md)).

## 4. Leaderboard — a view/function, never a client-written table

The leaderboard is **derived** from `level_progress`. Two shapes (pick in WS5, see open decisions):

- **Per-level:** top scores for one `level_id`.
- **Global total:** `sum(best_score)` across levels per user.

```sql
-- Per-level ranking, restricted to opt-in profiles, exposing ONLY public columns.
create or replace function public.get_level_leaderboard(p_level_id text, p_limit int default 50)
returns table(rank bigint, username citext, best_score int, stars smallint)
language sql stable security definer set search_path = public as $$
  select rank() over (order by lp.best_score desc, lp.updated_at asc),
         p.username, lp.best_score, lp.stars
  from level_progress lp
  join profiles p on p.id = lp.user_id
  where lp.level_id = p_level_id and p.leaderboard_opt_in = true
  order by lp.best_score desc, lp.updated_at asc
  limit p_limit;
$$;
```
- **`security definer` + explicit column list** = the function returns aggregate/public data only; it never exposes `user_id` or email even though it reads restricted tables.
- **"My rank"** (even if outside top-N) = a sibling function computing the caller's rank via `rank()` over the same order, filtered to `auth.uid()`.
- **Scale path:** at MVP a plain view/function over the indexed table is fine. If it gets hot → **materialized view** refreshed on write (`refresh materialized view concurrently`) **or** a maintained `leaderboard_totals` summary table updated inside the same transaction as the verified score write.

## 5. RLS policy sketch

Principle: **users read their own rows; nobody writes scores directly; the public sees only the aggregate leaderboard.** Writes to `level_progress`/`score_events` happen exclusively through the anti-cheat serverless function using the **service role** (which bypasses RLS).

```sql
-- profiles: read/update your own; no public table-wide read.
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);

-- level_progress: read your own only. NO insert/update/delete policy →
-- default-deny for all clients. Only the service-role function writes.
alter table public.level_progress enable row level security;
create policy progress_select_own on public.level_progress for select using (auth.uid() = user_id);

-- score_events: no client access at all (service role only).
alter table public.score_events enable row level security;
-- (intentionally zero policies → clients can neither read nor write)
```

- **Leaderboard read** is *not* a broad `select` policy on `level_progress`; it is the `security definer` function in §4, which is the only path that reveals other users' data, and only the public columns of opt-in profiles.
- **Why default-deny writes:** if clients could `insert`/`update` their own `best_score`, the leaderboard would be trivially forgeable. RLS makes the anti-cheat function the *only* writer. This RLS shape is the schema-level enforcement of [40-anti-cheat](./40-anti-cheat.md).
- **Erasure:** `on delete cascade` from `auth.users` → `profiles` → `level_progress`/`score_events` gives a single-point account deletion ([30 §erasure](./30-compliance.md)).

## 6. Indexes summary

| Index | Purpose |
|---|---|
| `profiles(username)` unique | handle uniqueness / lookup |
| `level_progress (level_id, best_score desc, updated_at)` | per-level top-N leaderboard |
| `score_events (user_id, level_id, created_at desc)` | audit / anomaly queries |
| (opt.) materialized `leaderboard_totals` | global-total board at scale |
