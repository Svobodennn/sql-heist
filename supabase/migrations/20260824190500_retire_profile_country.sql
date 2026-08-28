-- Country has no product purpose in SQL Heist. Keep the nullable base column
-- private for backward-compatible exports, but stop browser writes and remove it
-- from both anonymous public surfaces.
revoke update (country) on table public.profiles from authenticated;

drop view public.public_profiles;
create view public.public_profiles
with (security_invoker = false)
as
  select
    p.username,
    p.display_name,
    p.created_at,
    coalesce((
      select sum(cardinality(cp.completed_objectives))::int
      from public.case_progress as cp
      where cp.user_id = p.id
    ), 0) as objectives_cleared
  from public.profiles as p
  where p.leaderboard_opt_in = true
    and p.delete_requested_at is null;

revoke all on table public.public_profiles from public, anon, authenticated;
grant select on table public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Opt-in public profiles: username, display name, join date, and objective count only.';

drop view public.leaderboard;
create view public.leaderboard
with (security_invoker = false)
as
  select
    p.username,
    p.display_name,
    coalesce(sum(cardinality(cp.completed_objectives))::int, 0) as objectives_cleared,
    max(cp.updated_at) as last_active
  from public.profiles as p
  left join public.case_progress as cp on cp.user_id = p.id
  where p.leaderboard_opt_in = true
    and p.delete_requested_at is null
  group by p.id, p.username, p.display_name;

revoke all on table public.leaderboard from public, anon, authenticated;
grant select on table public.leaderboard to anon, authenticated;

comment on view public.leaderboard is
  'Opt-in casual leaderboard: username, display name, objective count, and activity only.';
