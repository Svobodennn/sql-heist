create or replace view public.leaderboard
with (security_invoker = false)
as
  select
    p.username,
    p.display_name,
    p.country,
    coalesce(sum(cardinality(cp.completed_objectives))::int, 0) as objectives_cleared,
    max(cp.updated_at) as last_active
  from public.profiles as p
  left join public.case_progress as cp on cp.user_id = p.id
  where p.leaderboard_opt_in = true
    and p.delete_requested_at is null
  group by p.id, p.username, p.display_name, p.country;

revoke all on table public.leaderboard from public, anon, authenticated;
grant select on table public.leaderboard to anon, authenticated;

comment on view public.leaderboard is
  'Opt-in casual leaderboard. Curated columns only: never exposes auth email or profile id.';

create or replace function public.get_my_rank()
returns table(rank bigint, objectives_cleared int)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  with board as (
    select
      p.id,
      coalesce(sum(cardinality(cp.completed_objectives))::int, 0) as objectives_cleared,
      max(cp.updated_at) as last_active
    from public.profiles as p
    left join public.case_progress as cp on cp.user_id = p.id
    where p.leaderboard_opt_in = true
      and p.delete_requested_at is null
    group by p.id
  ),
  ranked as (
    select
      board.id,
      board.objectives_cleared,
      rank() over (
        order by board.objectives_cleared desc, board.last_active asc nulls last
      ) as rank_position
    from board
  )
  select ranked.rank_position, ranked.objectives_cleared
  from ranked
  where ranked.id = (select auth.uid());
$$;

revoke all on function public.get_my_rank() from public, anon, authenticated;
grant execute on function public.get_my_rank() to authenticated;

comment on function public.get_my_rank() is
  'Returns only the authenticated opted-in user''s casual leaderboard rank and objective count.';
