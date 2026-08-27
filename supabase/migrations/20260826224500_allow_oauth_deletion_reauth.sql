-- The privacy notice changed to disclose Google/GitHub sign-in. New grants must
-- acknowledge that version; withdrawals remain possible from stale clients.
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
  expected_notice_version constant text := '2026-08-26';
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

-- OAuth-only accounts cannot present a password. Accept either supported recent
-- authentication method while keeping the operation bound exclusively to auth.uid().
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
     where method ->> 'method' in ('password', 'oauth')
       and case
         when jsonb_typeof(method -> 'timestamp') = 'number'
           then (method ->> 'timestamp')::bigint
             >= extract(epoch from statement_timestamp())::bigint - 300
         else false
       end
  ) then
    raise exception 'recent password or oauth authentication required' using errcode = '42501';
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
      '2026-08-26',
      'account_deletion'
    );
  end if;

  return requested_at;
end;
$$;

revoke all on function public.request_account_deletion()
  from public, anon, authenticated;
grant execute on function public.request_account_deletion()
  to authenticated;

comment on function public.request_account_deletion() is
  'Idempotently soft-locks auth.uid() after recent password or OAuth authentication.';
