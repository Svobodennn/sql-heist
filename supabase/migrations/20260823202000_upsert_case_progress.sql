create or replace function public.upsert_case_progress(
  p_case_id text,
  p_completed_objectives text[]
)
returns void
language sql
volatile
security invoker
set search_path = public, extensions
as $$
  insert into public.case_progress as existing_progress (
    user_id,
    case_id,
    completed_objectives,
    updated_at
  )
  values (
    (select auth.uid()),
    p_case_id,
    array(
      select distinct objective_id
      from unnest(coalesce(p_completed_objectives, '{}'::text[])) as objective_id
      where objective_id is not null
      order by objective_id
    ),
    now()
  )
  on conflict (user_id, case_id) do update
  set completed_objectives = array(
        select distinct objective_id
        from unnest(
          existing_progress.completed_objectives || excluded.completed_objectives
        ) as objective_id
        where objective_id is not null
        order by objective_id
      ),
      updated_at = now()
  where existing_progress.user_id = (select auth.uid());
$$;

revoke all on function public.upsert_case_progress(text, text[]) from public, anon;
grant execute on function public.upsert_case_progress(text, text[]) to authenticated;

comment on function public.upsert_case_progress(text, text[]) is
  'Atomically unions the authenticated user''s completed case objectives.';
