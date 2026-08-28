-- A browser session can change between re-authentication and the following RPC
-- request (for example, through another tab). Bind the mutation to the account
-- that initiated re-authentication so a switched session fails closed.
drop function if exists public.request_account_deletion();

create function public.request_account_deletion(
  p_expected_user_id uuid
)
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

  if p_expected_user_id is null or caller_id is distinct from p_expected_user_id then
    raise exception 'authenticated user does not match deletion target' using errcode = '42501';
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

revoke all on function public.request_account_deletion(uuid)
  from public, anon, authenticated;
grant execute on function public.request_account_deletion(uuid)
  to authenticated;

comment on function public.request_account_deletion(uuid) is
  'Idempotently soft-locks the expected auth.uid() after recent password or OAuth authentication.';
