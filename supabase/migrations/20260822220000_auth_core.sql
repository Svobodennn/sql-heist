-- Historical auth baseline. The guards keep this migration inert when it is
-- recorded against the already-provisioned production project, while a fresh
-- project receives the schema expected by every later migration.
create extension if not exists citext with schema extensions;

do $migration$
declare
  created_profiles boolean := false;
begin
  if to_regclass('public.profiles') is null then
    execute $sql$
      create table public.profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        username extensions.citext unique not null,
        display_name text,
        country text,
        leaderboard_opt_in boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        constraint username_format check (username ~ '^[a-z0-9_]{3,20}$'),
        constraint display_name_bounded check (
          display_name is null or char_length(display_name) between 1 and 40
        )
      )
    $sql$;

    execute 'alter table public.profiles enable row level security';
    execute $sql$
      create policy profiles_select_own
        on public.profiles
        for select
        using ((select auth.uid()) = id)
    $sql$;
    execute $sql$
      create policy profiles_insert_self
        on public.profiles
        for insert
        with check ((select auth.uid()) = id)
    $sql$;
    execute $sql$
      create policy profiles_update_own
        on public.profiles
        for update
        using ((select auth.uid()) = id)
        with check ((select auth.uid()) = id)
    $sql$;
    execute 'grant select, insert, update on table public.profiles to authenticated';
    created_profiles := true;
  end if;

  if to_regclass('public.case_progress') is null then
    execute $sql$
      create table public.case_progress (
        user_id uuid not null references public.profiles(id) on delete cascade,
        case_id text not null,
        completed_objectives text[] not null default '{}',
        best_score int check (best_score between 0 and 1200),
        updated_at timestamptz not null default now(),
        primary key (user_id, case_id),
        constraint case_id_bounded check (char_length(case_id) between 1 and 64),
        constraint objectives_bounded check (cardinality(completed_objectives) <= 50)
      )
    $sql$;

    execute 'alter table public.case_progress enable row level security';
    execute $sql$
      create policy cp_select_own
        on public.case_progress
        for select
        using ((select auth.uid()) = user_id)
    $sql$;
    execute $sql$
      create policy cp_insert_own
        on public.case_progress
        for insert
        with check ((select auth.uid()) = user_id)
    $sql$;
    execute $sql$
      create policy cp_update_own
        on public.case_progress
        for update
        using ((select auth.uid()) = user_id)
        with check ((select auth.uid()) = user_id)
    $sql$;
    execute 'grant select, insert, update on table public.case_progress to authenticated';
  end if;

  if created_profiles then
    execute $sql$
      create function public.username_available(p_username extensions.citext)
      returns boolean
      language sql
      stable
      security definer
      set search_path = public, extensions
      as $function$
        select not exists (
          select 1 from public.profiles where username = p_username
        )
      $function$
    $sql$;
    execute 'revoke all on function public.username_available(extensions.citext) from public';
    execute 'grant execute on function public.username_available(extensions.citext) to anon, authenticated';
  end if;
end
$migration$;
