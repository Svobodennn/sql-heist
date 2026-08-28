create table public.profile_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  purpose text not null check (purpose = 'public_profile'),
  action text not null check (action in ('granted', 'withdrawn')),
  notice_version text not null
    check (notice_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  source text not null check (source in ('account_settings', 'account_deletion')),
  occurred_at timestamptz not null default statement_timestamp()
);

create index profile_consent_events_user_timeline_idx
  on public.profile_consent_events (user_id, id);

alter table public.profile_consent_events enable row level security;

revoke all on table public.profile_consent_events from public, anon, authenticated;
revoke all on sequence public.profile_consent_events_id_seq from public, anon, authenticated;
grant select on table public.profile_consent_events to authenticated;

create policy profile_consent_events_select_own
  on public.profile_consent_events
  for select
  using ((select auth.uid()) = user_id);

comment on table public.profile_consent_events is
  'Append-only evidence of authenticated public-profile consent state transitions.';

-- Legacy opt-ins have no versioned evidence. Reset them instead of fabricating an
-- event; affected users may explicitly opt in again through the audited RPC.
--
-- Keep the reset and privilege cutover in one statement-level transaction. The lock
-- waits for pre-existing profile writers and prevents a concurrent legacy client from
-- committing an unaudited opt-in between the reset and the privilege revocation.
do $cutover$
begin
  lock table public.profiles in share row exclusive mode;

  update public.profiles
     set leaderboard_opt_in = false
   where leaderboard_opt_in = true;

  -- Public visibility must change together with its evidence. Removing the direct
  -- column grant prevents a browser client from bypassing the audited RPC.
  execute 'revoke update on table public.profiles from authenticated';
  execute 'revoke update (display_name, country, leaderboard_opt_in) on table public.profiles from authenticated';
  execute 'grant update (display_name, country) on table public.profiles to authenticated';
end;
$cutover$;

create or replace function public.set_public_profile_consent(
  p_enabled boolean,
  p_notice_version text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  caller_id uuid := (select auth.uid());
  current_profile public.profiles%rowtype;
  expected_notice_version constant text := '2026-08-23';
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_enabled is null then
    raise exception 'consent choice required' using errcode = '22004';
  end if;

  if p_notice_version is null
    or p_notice_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  then
    raise exception 'valid privacy notice version required' using errcode = '22023';
  end if;

  -- A stale client may always withdraw. New grants require the current notice so
  -- consent cannot be collected against copy the server no longer recognizes.
  if p_enabled and p_notice_version is distinct from expected_notice_version then
    raise exception 'privacy notice is out of date' using errcode = '22023';
  end if;

  select p.*
    into current_profile
    from public.profiles as p
   where p.id = caller_id
   for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if current_profile.delete_requested_at is not null then
    raise exception 'account deletion already requested' using errcode = '42501';
  end if;

  if current_profile.leaderboard_opt_in is distinct from p_enabled then
    update public.profiles
       set leaderboard_opt_in = p_enabled
     where id = caller_id
     returning * into current_profile;

    insert into public.profile_consent_events (
      user_id,
      purpose,
      action,
      notice_version,
      source
    )
    values (
      caller_id,
      'public_profile',
      case when p_enabled then 'granted' else 'withdrawn' end,
      p_notice_version,
      'account_settings'
    );
  end if;

  return jsonb_build_object(
    'id', current_profile.id,
    'username', current_profile.username,
    'display_name', current_profile.display_name,
    'country', current_profile.country,
    'leaderboard_opt_in', current_profile.leaderboard_opt_in,
    'delete_requested_at', current_profile.delete_requested_at,
    'created_at', current_profile.created_at,
    'updated_at', current_profile.updated_at
  );
end;
$$;

revoke all on function public.set_public_profile_consent(boolean, text)
  from public, anon, authenticated;
grant execute on function public.set_public_profile_consent(boolean, text)
  to authenticated;

comment on function public.set_public_profile_consent(boolean, text) is
  'Atomically changes the caller public-profile consent and records a trusted event.';

-- Account deletion is also a consent withdrawal path. Preserve the recent-auth,
-- one-way soft-lock contract while recording the transition in the same transaction.
create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  caller_id uuid := (select auth.uid());
  requested_at timestamptz;
  was_opted_in boolean;
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select p.delete_requested_at, p.leaderboard_opt_in
    into requested_at, was_opted_in
    from public.profiles as p
   where p.id = caller_id
   for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if requested_at is not null then
    return requested_at;
  end if;

  if not exists (
    select 1
      from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as method
     where method ->> 'method' = 'password'
       and (method ->> 'timestamp')::bigint
         >= extract(epoch from statement_timestamp())::bigint - 300
  ) then
    raise exception 'recent password authentication required' using errcode = '42501';
  end if;

  update public.profiles
     set leaderboard_opt_in = false,
         delete_requested_at = statement_timestamp()
   where id = caller_id
   returning delete_requested_at into requested_at;

  if was_opted_in then
    insert into public.profile_consent_events (
      user_id,
      purpose,
      action,
      notice_version,
      source
    )
    values (
      caller_id,
      'public_profile',
      'withdrawn',
      '2026-08-23',
      'account_deletion'
    );
  end if;

  return requested_at;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;

comment on function public.request_account_deletion() is
  'Idempotently soft-locks the caller account and records any public-consent withdrawal.';
