alter table public.profiles
  add constraint profiles_display_name_length
    check (char_length(display_name) <= 80) not valid,
  add constraint profiles_country_length
    check (char_length(country) <= 56) not valid;

alter table public.profiles validate constraint profiles_display_name_length;
alter table public.profiles validate constraint profiles_country_length;

-- Browser clients may create only the identity columns and may update only the
-- editable public fields. Immutable identity/timestamp/deletion columns stay
-- outside the PostgREST write surface even when a caller bypasses the UI.
revoke insert, update on table public.profiles from public, anon, authenticated;
grant insert (id, username) on table public.profiles to authenticated;
grant update (display_name, country, leaderboard_opt_in)
  on table public.profiles to authenticated;

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profile_updated_at();

-- Account deletion remains an operator-completed request in this client-only
-- phase. This RPC is the sole browser write path for delete_requested_at: it
-- requires a password authentication no older than five minutes, takes a row
-- lock, stamps trusted database time, withdraws public consent, and returns the
-- existing timestamp on retries so a lost response cannot strand the user.
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
begin
  if caller_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select p.delete_requested_at
    into requested_at
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

  return requested_at;
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

comment on function public.request_account_deletion() is
  'Idempotently records an own-account erasure request after recent password authentication.';
