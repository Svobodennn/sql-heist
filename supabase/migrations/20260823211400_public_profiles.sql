alter table public.profiles
  add column if not exists delete_requested_at timestamptz;

-- A deletion request is a one-way soft lock. The caller may set the timestamp
-- while the row is active; once set, no browser client can update it again.
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles
  for insert
  with check (
    (select auth.uid()) = id
    and delete_requested_at is null
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  using (
    (select auth.uid()) = id
    and delete_requested_at is null
  )
  with check ((select auth.uid()) = id);

-- Existing sessions may remain open on another device after a deletion request.
-- Keep own-row reads available for manual export, but reject all new progress.
drop policy if exists cp_insert_own on public.case_progress;
create policy cp_insert_own
  on public.case_progress
  for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.delete_requested_at is null
    )
  );

drop policy if exists cp_update_own on public.case_progress;
create policy cp_update_own
  on public.case_progress
  for update
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.delete_requested_at is null
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.delete_requested_at is null
    )
  );

create or replace view public.public_profiles
with (security_invoker = false)
as
  select
    p.username,
    p.display_name,
    p.country,
    p.created_at,
    coalesce((
      select sum(cardinality(cp.completed_objectives))::int
      from public.case_progress cp
      where cp.user_id = p.id
    ), 0) as objectives_cleared
  from public.profiles p
  where p.leaderboard_opt_in = true
    and p.delete_requested_at is null;

revoke all on table public.public_profiles from public, anon, authenticated;
grant select on table public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Opt-in public profiles. Curated columns only: never exposes auth email or profile id.';

-- Anonymous signup no longer probes whether a private handle exists. A confirmed,
-- authenticated user may still check before claiming; the unique constraint stays
-- the final authority for races.
revoke all on function public.username_available(extensions.citext) from public, anon;
grant execute on function public.username_available(extensions.citext) to authenticated;
