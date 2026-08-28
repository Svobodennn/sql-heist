-- Keep browser mutation surfaces narrow even when a caller bypasses the UI.
-- Profiles remain editable only through their existing column grants and audited
-- RPCs; progress becomes read-only except for the caller-bound merge RPC below.
revoke delete on table public.profiles from public, anon, authenticated;
revoke insert, update, delete on table public.case_progress
  from public, anon, authenticated;

create or replace function public.upsert_case_progress(
  p_case_id text,
  p_completed_objectives text[]
)
returns void
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $$
declare
  caller_id uuid := (select auth.uid());
  deletion_requested_at timestamptz;
  normalized_objectives text[];
  existing_objectives text[];
  merged_objectives text[];
  progress_exists boolean;
  progress_count integer;
  max_progress_rows constant integer := 100;
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_case_id is null
    or char_length(btrim(p_case_id)) = 0
    or char_length(p_case_id) > 64
  then
    raise exception 'case id must contain 1 to 64 characters' using errcode = '22023';
  end if;

  if p_completed_objectives is null
    or cardinality(p_completed_objectives) = 0
    or cardinality(p_completed_objectives) > 50
  then
    raise exception 'objective list must contain 1 to 50 entries' using errcode = '22023';
  end if;

  if exists (
    select 1
      from unnest(p_completed_objectives) as objective_id
     where objective_id is null
        or char_length(btrim(objective_id)) = 0
        or char_length(objective_id) > 64
  ) then
    raise exception 'objective ids must contain 1 to 64 characters' using errcode = '22023';
  end if;

  -- This row lock both enforces the deletion soft-lock and serializes all progress
  -- writes for one account, so the per-user row quota cannot be raced.
  select p.delete_requested_at
    into deletion_requested_at
    from public.profiles as p
   where p.id = caller_id
   for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if deletion_requested_at is not null then
    raise exception 'account deletion already requested' using errcode = '42501';
  end if;

  select array_agg(distinct objective_id order by objective_id)
    into normalized_objectives
    from unnest(p_completed_objectives) as objective_id;

  select cp.completed_objectives
    into existing_objectives
    from public.case_progress as cp
   where cp.user_id = caller_id
     and cp.case_id = p_case_id;
  progress_exists := found;

  if progress_exists then
    select array_agg(distinct objective_id order by objective_id)
      into merged_objectives
      from unnest(existing_objectives || normalized_objectives) as objective_id;

    if cardinality(merged_objectives) > 50 then
      raise exception 'case progress cannot exceed 50 objectives' using errcode = '22023';
    end if;
  else
    select count(*)::integer
      into progress_count
      from public.case_progress as cp
     where cp.user_id = caller_id;

    if progress_count >= max_progress_rows then
      raise exception 'case progress limit reached' using errcode = '54000';
    end if;

    merged_objectives := normalized_objectives;
  end if;

  -- PostgreSQL INSERT ... ON CONFLICT is the atomic upsert mechanism. The profile
  -- lock above makes the quota check and set union retry-safe for this caller.
  insert into public.case_progress as existing_progress (
    user_id,
    case_id,
    completed_objectives,
    updated_at
  )
  values (
    caller_id,
    p_case_id,
    merged_objectives,
    statement_timestamp()
  )
  on conflict (user_id, case_id) do update
  set completed_objectives = excluded.completed_objectives,
      updated_at = statement_timestamp()
  where existing_progress.user_id = caller_id;
end;
$$;

revoke all on function public.upsert_case_progress(text, text[])
  from public, anon, authenticated;
grant execute on function public.upsert_case_progress(text, text[])
  to authenticated;

comment on function public.upsert_case_progress(text, text[]) is
  'Atomically unions bounded progress for auth.uid(); sole browser progress write path.';

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
  event_count integer;
  expected_notice_version constant text := '2026-08-23';
  max_consent_events constant integer := 100;
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
    -- Withdrawal is never quota-blocked. Since accounts begin private and every
    -- state change is serialized by the profile lock, the normal path cannot be
    -- opted in at the limit; a user can always leave public views immediately.
    if p_enabled then
      select count(*)::integer
        into event_count
        from public.profile_consent_events as event
       where event.user_id = caller_id;

      if event_count >= max_consent_events then
        raise exception 'public profile consent change limit reached' using errcode = '54000';
      end if;
    end if;

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
  'Atomically changes bounded public-profile consent for auth.uid() and records evidence.';
