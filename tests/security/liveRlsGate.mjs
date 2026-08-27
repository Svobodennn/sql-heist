import { randomUUID } from 'node:crypto'
import { createLiveGateContext } from './liveRlsGateSupport.mjs'

const gate = createLiveGateContext()
const { users, check, success, blocked, sql, browserClient } = gate

async function verifySchema() {
  const rows = await sql(
    [
      'select jsonb_build_object(',
      " 'tables', (select jsonb_object_agg(c.relname, c.relrowsecurity)",
      '   from pg_class c join pg_namespace n on n.oid = c.relnamespace',
      "   where n.nspname = 'public' and c.relkind = 'r'",
      '  ),',
      " 'event_policy_count', (select count(*) from pg_policies",
      "   where schemaname = 'public' and tablename = 'profile_consent_events'),",
      " 'event_select_policy_count', (select count(*) from pg_policies",
      "   where schemaname = 'public' and tablename = 'profile_consent_events'",
      "     and cmd = 'SELECT'),",
      " 'event_select', has_table_privilege('authenticated',",
      "   'public.profile_consent_events','select'),",
      " 'event_insert', has_table_privilege('authenticated',",
      "   'public.profile_consent_events','insert'),",
      " 'event_update', has_table_privilege('authenticated',",
      "   'public.profile_consent_events','update'),",
      " 'event_delete', has_table_privilege('authenticated',",
      "   'public.profile_consent_events','delete'),",
      " 'opt_in_update', has_column_privilege('authenticated',",
      "   'public.profiles','leaderboard_opt_in','update'),",
      " 'display_update', has_column_privilege('authenticated',",
      "   'public.profiles','display_name','update'),",
      " 'country_exists', exists (select 1",
      '   from pg_attribute a',
      "   where a.attrelid = 'public.profiles'::regclass",
      "     and a.attname = 'country' and not a.attisdropped),",
      " 'profile_delete', has_table_privilege('authenticated',",
      "   'public.profiles','delete'),",
      " 'progress_select', has_table_privilege('authenticated',",
      "   'public.case_progress','select'),",
      " 'progress_insert', has_table_privilege('authenticated',",
      "   'public.case_progress','insert'),",
      " 'progress_update', has_table_privilege('authenticated',",
      "   'public.case_progress','update'),",
      " 'progress_delete', has_table_privilege('authenticated',",
      "   'public.case_progress','delete'),",
      " 'function', (select jsonb_build_object(",
      "   'definer', p.prosecdef, 'config', p.proconfig,",
      "   'args', pg_get_function_identity_arguments(p.oid),",
      "   'anon', has_function_privilege('anon', p.oid, 'execute'),",
      "   'authed', has_function_privilege('authenticated', p.oid, 'execute'))",
      '   from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
      "   where n.nspname = 'public'",
      "     and p.proname = 'set_public_profile_consent'),",
      " 'progress_function', (select jsonb_build_object(",
      "   'definer', p.prosecdef, 'config', p.proconfig,",
      "   'args', pg_get_function_identity_arguments(p.oid),",
      "   'anon', has_function_privilege('anon', p.oid, 'execute'),",
      "   'authed', has_function_privilege('authenticated', p.oid, 'execute'))",
      '   from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
      "   where n.nspname = 'public'",
      "     and p.proname = 'upsert_case_progress'),",
      " 'deletion_function', (select jsonb_build_object(",
      "   'definer', p.prosecdef, 'config', p.proconfig,",
      "   'args', pg_get_function_identity_arguments(p.oid),",
      "   'definition', pg_get_functiondef(p.oid),",
      "   'anon', has_function_privilege('anon', p.oid, 'execute'),",
      "   'authed', has_function_privilege('authenticated', p.oid, 'execute'))",
      '   from pg_proc p join pg_namespace n on n.oid = p.pronamespace',
      "   where n.nspname = 'public'",
      "     and p.proname = 'request_account_deletion')",
      ') as gate',
    ].join('\n'),
  )
  const live = rows[0]?.gate
  const publicTables = Object.keys(live?.tables ?? {}).sort()

  check(
    JSON.stringify(publicTables) ===
      JSON.stringify(['case_progress', 'profile_consent_events', 'profiles']) &&
      publicTables.every((tableName) => live.tables[tableName] === true),
    'every public base table is expected and has RLS enabled',
  )
  check(
    live?.event_policy_count === 1 && live?.event_select_policy_count === 1,
    'consent table has exactly one SELECT policy',
  )
  check(
    live?.event_select === true &&
      live?.event_insert === false &&
      live?.event_update === false &&
      live?.event_delete === false,
    'consent table is append-only to browser roles',
  )
  check(
    live?.opt_in_update === false &&
      live?.display_update === true &&
      live?.country_exists === false,
    'direct opt-in updates are revoked, country is absent, and display-name edits remain',
  )
  check(live?.profile_delete === false, 'direct profile deletion privilege is revoked')
  check(
    live?.progress_select === true &&
      live?.progress_insert === false &&
      live?.progress_update === false &&
      live?.progress_delete === false,
    'progress is browser-readable but directly immutable',
  )
  check(
    live?.function?.definer === true &&
      live?.function?.anon === false &&
      live?.function?.authed === true,
    'consent RPC is authenticated-only SECURITY DEFINER',
  )
  check(
    live?.function?.args === 'p_enabled boolean, p_notice_version text' &&
      live?.function?.config?.includes('search_path=pg_catalog'),
    'consent RPC has no target user and pins search_path',
  )
  check(
    live?.progress_function?.definer === true &&
      live?.progress_function?.anon === false &&
      live?.progress_function?.authed === true,
    'progress RPC is authenticated-only SECURITY DEFINER',
  )
  check(
    live?.progress_function?.args === 'p_case_id text, p_completed_objectives text[]' &&
      live?.progress_function?.config?.includes('search_path=pg_catalog'),
    'progress RPC has no target user and pins search_path',
  )
  check(
    live?.deletion_function?.definer === true &&
      live?.deletion_function?.anon === false &&
      live?.deletion_function?.authed === true,
    'deletion RPC is authenticated-only SECURITY DEFINER',
  )
  check(
    live?.deletion_function?.args === 'p_expected_user_id uuid' &&
      live?.deletion_function?.config?.includes('search_path=pg_catalog'),
    'deletion RPC requires an expected user and pins search_path',
  )
  check(
    live?.deletion_function?.definition?.includes('password') &&
      live?.deletion_function?.definition?.includes('oauth') &&
      live?.deletion_function?.definition?.includes('300') &&
      live?.deletion_function?.definition?.includes('p_expected_user_id'),
    'deletion RPC binds the target and accepts only recent password or OAuth AMR methods',
  )
}

async function signIn(client, user, label) {
  const result = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })
  check(!result.error && result.data.user?.id === user.id, label)
  return result.data.session
}

async function verifyProfiles(a, b, anon) {
  const columns =
    'id,username,display_name,leaderboard_opt_in,delete_requested_at,created_at,updated_at'

  success(
    await a
      .from('profiles')
      .insert({ id: users.a.id, username: users.a.username })
      .select(columns)
      .single(),
    'user A creates its own profile',
  )
  blocked(
    await b
      .from('profiles')
      .insert({ id: users.b.id, username: users.b.username, country: 'TR' })
      .select('id'),
    'removed country cannot be supplied during profile creation',
  )
  success(
    await b
      .from('profiles')
      .insert({ id: users.b.id, username: users.b.username })
      .select(columns)
      .single(),
    'user B creates its own profile',
  )
  blocked(
    await b
      .from('profiles')
      .insert({ id: randomUUID(), username: `cross_${users.a.username.slice(-8)}` })
      .select('id'),
    'cross-user profile insertion is blocked',
  )
  success(
    await a.from('profiles').select('id').eq('id', users.a.id).single(),
    'own base-profile read succeeds',
  )
  blocked(
    await b.from('profiles').select('id').eq('id', users.a.id),
    'cross-user base-profile read is hidden',
  )
  blocked(
    await anon.from('profiles').select('id').eq('id', users.a.id),
    'anonymous base-profile read is denied',
  )

  const edited = success(
    await a
      .from('profiles')
      .update({ display_name: 'Agent A' })
      .eq('id', users.a.id)
      .select('display_name')
      .single(),
    'own display-name update succeeds',
  )
  check(edited.display_name === 'Agent A', 'display name round-trips')
  blocked(
    await a.from('profiles').update({ country: 'TR' }).eq('id', users.a.id).select('id'),
    'removed country cannot be updated',
  )
  blocked(
    await a.from('profiles').update({ leaderboard_opt_in: true }).eq('id', users.a.id).select('id'),
    'direct opt-in update is blocked',
  )
  blocked(
    await a
      .from('profiles')
      .update({ username: `mut_${users.a.username.slice(-8)}` })
      .eq('id', users.a.id)
      .select('id'),
    'immutable username update is blocked',
  )
  blocked(
    await b
      .from('profiles')
      .update({ display_name: 'Cross-user edit' })
      .eq('id', users.a.id)
      .select('id'),
    'cross-user profile update is blocked',
  )
  blocked(
    await a.from('profiles').delete().eq('id', users.a.id).select('id'),
    'direct own-profile delete is blocked',
  )
  blocked(
    await b.from('profiles').delete().eq('id', users.a.id).select('id'),
    'cross-user profile delete is blocked',
  )
  success(
    await a.from('profiles').select('id').eq('id', users.a.id).single(),
    'blocked deletes leave profile intact',
  )
}

async function verifyProgress(a, b, anon) {
  check(
    Boolean(
      (
        await anon.rpc('upsert_case_progress', {
          p_case_id: 'case-anon',
          p_completed_objectives: ['obj-x'],
        })
      ).error,
    ),
    'anonymous progress RPC is denied',
  )
  success(
    await a.rpc('upsert_case_progress', {
      p_case_id: 'case-rls',
      p_completed_objectives: ['obj-b', 'obj-a'],
    }),
    'first own progress merge succeeds',
  )
  success(
    await a.rpc('upsert_case_progress', {
      p_case_id: 'case-rls',
      p_completed_objectives: ['obj-c', 'obj-a'],
    }),
    'retrying own progress merge succeeds',
  )
  const progress = success(
    await a.from('case_progress').select('completed_objectives').eq('case_id', 'case-rls').single(),
    'own progress read succeeds',
  )
  check(
    JSON.stringify(progress.completed_objectives) === JSON.stringify(['obj-a', 'obj-b', 'obj-c']),
    'progress merge is sorted, idempotent set union',
  )
  blocked(
    await a
      .from('case_progress')
      .insert({
        user_id: users.a.id,
        case_id: 'case-direct',
        completed_objectives: ['obj-direct'],
      })
      .select('user_id'),
    'direct own-progress insert is blocked',
  )
  blocked(
    await a
      .from('case_progress')
      .update({ completed_objectives: ['obj-direct'] })
      .eq('user_id', users.a.id)
      .eq('case_id', 'case-rls')
      .select('user_id'),
    'direct own-progress update is blocked',
  )
  blocked(
    await b.from('case_progress').select('user_id').eq('user_id', users.a.id),
    'cross-user progress read is hidden',
  )
  blocked(
    await anon.from('case_progress').select('user_id').eq('user_id', users.a.id),
    'anonymous progress read is denied',
  )
  blocked(
    await b
      .from('case_progress')
      .insert({
        user_id: users.a.id,
        case_id: 'case-cross',
        completed_objectives: ['obj-x'],
      })
      .select('user_id'),
    'cross-user progress insert is blocked',
  )
  blocked(
    await b
      .from('case_progress')
      .update({ completed_objectives: ['obj-x'] })
      .eq('user_id', users.a.id)
      .select('user_id'),
    'cross-user progress update is blocked',
  )
  blocked(
    await a
      .from('case_progress')
      .delete()
      .eq('user_id', users.a.id)
      .eq('case_id', 'case-rls')
      .select('user_id'),
    'direct own-progress delete is blocked',
  )
  blocked(
    await b.from('case_progress').delete().eq('user_id', users.a.id).select('user_id'),
    'cross-user progress delete is blocked',
  )
  blocked(
    await anon.from('case_progress').delete().eq('user_id', users.a.id).select('user_id'),
    'anonymous progress delete is denied',
  )

  check(
    Boolean(
      (
        await a.rpc('upsert_case_progress', {
          p_case_id: '',
          p_completed_objectives: ['obj-x'],
        })
      ).error,
    ),
    'progress RPC rejects an empty case id',
  )
  check(
    Boolean(
      (
        await a.rpc('upsert_case_progress', {
          p_case_id: 'case-too-many',
          p_completed_objectives: Array.from({ length: 51 }, (_, index) => `obj-${index}`),
        })
      ).error,
    ),
    'progress RPC rejects more than 50 objective entries',
  )
  check(
    Boolean(
      (
        await a.rpc('upsert_case_progress', {
          p_case_id: 'case-invalid-objective',
          p_completed_objectives: ['   '],
        })
      ).error,
    ),
    'progress RPC rejects a blank objective id',
  )
  check(
    Boolean(
      (
        await a.rpc('upsert_case_progress', {
          p_case_id: 'case-invalid-objective',
          p_completed_objectives: ['x'.repeat(65)],
        })
      ).error,
    ),
    'progress RPC rejects an oversized objective id',
  )
}

async function verifyProgressQuota(b) {
  await sql(
    [
      'insert into public.case_progress (user_id, case_id, completed_objectives)',
      `select '${users.b.id}'::uuid, 'quota-' || lpad(series::text, 3, '0'), '{}'::text[]`,
      'from generate_series(1, 100) as series;',
    ].join('\n'),
  )

  check(
    Boolean(
      (
        await b.rpc('upsert_case_progress', {
          p_case_id: 'quota-overflow',
          p_completed_objectives: ['obj-x'],
        })
      ).error,
    ),
    'progress RPC blocks a 101st case row',
  )
  success(
    await b.rpc('upsert_case_progress', {
      p_case_id: 'quota-001',
      p_completed_objectives: ['obj-x'],
    }),
    'progress RPC still merges an existing case at the row limit',
  )
}

async function verifyGrantAndPublicViews(a, b, anon) {
  check(
    Boolean(
      (
        await anon.rpc('set_public_profile_consent', {
          p_enabled: true,
          p_notice_version: '2026-08-26',
        })
      ).error,
    ),
    'anonymous consent RPC is denied',
  )
  blocked(
    await anon.from('profile_consent_events').select('id'),
    'anonymous consent-history read is denied',
  )
  const initial = success(
    await a.from('profile_consent_events').select('id'),
    'own empty consent history is readable',
  )
  check(initial.length === 0, 'new profile has no fabricated consent event')
  blocked(
    await a
      .from('profile_consent_events')
      .insert({
        user_id: users.a.id,
        purpose: 'public_profile',
        action: 'granted',
        notice_version: '2026-08-26',
        source: 'account_settings',
      })
      .select('id'),
    'browser cannot forge consent evidence',
  )

  check(
    Boolean(
      (
        await b.rpc('set_public_profile_consent', {
          p_enabled: true,
          p_notice_version: '2020-01-01',
        })
      ).error,
    ),
    'stale notice grant fails closed',
  )
  const bPrivate = success(
    await b.from('profiles').select('leaderboard_opt_in').eq('id', users.b.id).single(),
    'user B profile remains readable after stale grant',
  )
  check(bPrivate.leaderboard_opt_in === false, 'stale grant leaves user B private')

  const grant = success(
    await a.rpc('set_public_profile_consent', {
      p_enabled: true,
      p_notice_version: '2026-08-26',
    }),
    'current notice grant succeeds',
  )
  check(
    grant.id === users.a.id && grant.leaderboard_opt_in === true,
    'grant RPC returns only opted-in caller profile',
  )

  const eventColumns = 'id,user_id,purpose,action,notice_version,source,occurred_at'
  const events = success(
    await a.from('profile_consent_events').select(eventColumns).order('id', { ascending: true }),
    'own consent history is readable after grant',
  )
  check(
    events.length === 1 &&
      events[0].action === 'granted' &&
      events[0].purpose === 'public_profile' &&
      events[0].notice_version === '2026-08-26' &&
      events[0].source === 'account_settings' &&
      Boolean(events[0].occurred_at),
    'grant records purpose, version, source, and trusted time',
  )
  const crossEvents = success(
    await b.from('profile_consent_events').select('id').eq('user_id', users.a.id),
    'cross-user consent query executes safely',
  )
  check(crossEvents.length === 0, 'user B cannot read user A consent evidence')
  blocked(
    await a
      .from('profile_consent_events')
      .update({ action: 'withdrawn' })
      .eq('id', events[0].id)
      .select('id'),
    'browser cannot alter consent evidence',
  )
  blocked(
    await a.from('profile_consent_events').delete().eq('id', events[0].id).select('id'),
    'browser cannot delete consent evidence',
  )

  success(
    await a.rpc('set_public_profile_consent', {
      p_enabled: true,
      p_notice_version: '2026-08-26',
    }),
    'repeated grant succeeds idempotently',
  )
  check(
    success(
      await a.from('profile_consent_events').select('id'),
      'history remains readable after grant retry',
    ).length === 1,
    'repeated grant creates no duplicate event',
  )

  const publicProfile = success(
    await anon.from('public_profiles').select('*').eq('username', users.a.username).single(),
    'opted-in profile is anonymously visible',
  )
  check(
    Object.keys(publicProfile).sort().join(',') ===
      ['created_at', 'display_name', 'objectives_cleared', 'username'].sort().join(','),
    'public profile exposes only four reviewed columns',
  )
  const leaderboard = success(
    await anon.from('leaderboard').select('*').eq('username', users.a.username).single(),
    'opted-in user is anonymously ranked',
  )
  check(
    Object.keys(leaderboard).sort().join(',') ===
      ['display_name', 'last_active', 'objectives_cleared', 'username'].sort().join(','),
    'leaderboard exposes only four reviewed columns',
  )

  return eventColumns
}

async function verifyRankAndUsername(a, b, anon) {
  const rankA = success(await a.rpc('get_my_rank'), 'opted-in caller receives rank')
  check(
    rankA.length === 1 &&
      Object.keys(rankA[0]).sort().join(',') === ['objectives_cleared', 'rank'].sort().join(','),
    'rank RPC returns only rank and objective count',
  )
  check(
    success(await b.rpc('get_my_rank'), 'private caller can safely query rank').length === 0,
    'private caller receives no rank row',
  )
  check(Boolean((await anon.rpc('get_my_rank')).error), 'anonymous rank RPC is denied')

  const candidate = `unused_${users.a.username.slice(-8)}`
  check(
    Boolean((await anon.rpc('username_available', { p_username: candidate })).error),
    'anonymous username probing is denied',
  )
  check(
    success(
      await b.rpc('username_available', { p_username: candidate }),
      'authenticated username check succeeds',
    ) === true,
    'username RPC returns one availability boolean',
  )
}

async function verifyWithdrawalAndBinding(a, b, anon, eventColumns) {
  const withdrawn = success(
    await a.rpc('set_public_profile_consent', {
      p_enabled: false,
      p_notice_version: '2020-01-01',
    }),
    'stale client may always withdraw',
  )
  check(withdrawn.leaderboard_opt_in === false, 'withdrawal immediately makes caller private')

  const events = success(
    await a.from('profile_consent_events').select(eventColumns).order('id', { ascending: true }),
    'withdrawal evidence remains readable',
  )
  check(
    events.length === 2 &&
      events[1].action === 'withdrawn' &&
      events[1].notice_version === '2020-01-01' &&
      events[1].source === 'account_settings',
    'stale-version withdrawal is recorded without being blocked',
  )
  success(
    await a.rpc('set_public_profile_consent', {
      p_enabled: false,
      p_notice_version: '2020-01-01',
    }),
    'repeated withdrawal succeeds idempotently',
  )
  check(
    success(
      await a.from('profile_consent_events').select('id'),
      'history remains readable after withdrawal retry',
    ).length === 2,
    'repeated withdrawal creates no duplicate event',
  )
  check(
    success(
      await anon.from('public_profiles').select('username').eq('username', users.a.username),
      'public profile query remains available after withdrawal',
    ).length === 0,
    'withdrawal removes user from public profile view',
  )
  check(
    success(
      await anon.from('leaderboard').select('username').eq('username', users.a.username),
      'leaderboard query remains available after withdrawal',
    ).length === 0,
    'withdrawal removes user from leaderboard',
  )

  const grantB = success(
    await b.rpc('set_public_profile_consent', {
      p_enabled: true,
      p_notice_version: '2026-08-26',
    }),
    'user B grants its own consent',
  )
  check(
    grantB.id === users.b.id && grantB.leaderboard_opt_in === true,
    'consent grant binds to user B auth.uid',
  )
  const aState = success(
    await a.from('profiles').select('leaderboard_opt_in').eq('id', users.a.id).single(),
    'user A profile remains readable',
  )
  check(aState.leaderboard_opt_in === false, 'user B cannot change user A consent state')
  success(
    await b.rpc('set_public_profile_consent', {
      p_enabled: false,
      p_notice_version: '2026-08-26',
    }),
    'user B withdraws its own consent',
  )
}

async function verifyConsentQuota(b) {
  await sql(
    [
      'insert into public.profile_consent_events',
      '  (user_id, purpose, action, notice_version, source)',
      `select '${users.b.id}'::uuid, 'public_profile',`,
      "       case when series % 2 = 1 then 'granted' else 'withdrawn' end,",
      "       '2026-08-26', 'account_settings'",
      'from generate_series(1, 98) as series;',
    ].join('\n'),
  )

  check(
    Boolean(
      (
        await b.rpc('set_public_profile_consent', {
          p_enabled: true,
          p_notice_version: '2026-08-26',
        })
      ).error,
    ),
    'consent RPC blocks a grant after 100 state-change events',
  )
  const profile = success(
    await b.from('profiles').select('leaderboard_opt_in').eq('id', users.b.id).single(),
    'consent-limited profile remains readable',
  )
  check(profile.leaderboard_opt_in === false, 'consent event limit leaves user B private')
  success(
    await b.rpc('set_public_profile_consent', {
      p_enabled: false,
      p_notice_version: '2020-01-01',
    }),
    'withdrawal remains available at the consent event limit',
  )
}

async function verifyDeletion(a, anon, eventColumns) {
  success(
    await a.rpc('set_public_profile_consent', {
      p_enabled: true,
      p_notice_version: '2026-08-26',
    }),
    'user A can re-grant before deletion test',
  )
  check(
    Boolean(
      (
        await anon.rpc('request_account_deletion', {
          p_expected_user_id: users.a.id,
        })
      ).error,
    ),
    'anonymous deletion RPC is denied',
  )

  const deletionTime = success(
    await a.rpc('request_account_deletion', { p_expected_user_id: users.a.id }),
    'recent password session requests own deletion',
  )
  check(
    typeof deletionTime === 'string' && !Number.isNaN(Date.parse(deletionTime)),
    'deletion RPC returns trusted database time',
  )
  const profile = success(
    await a
      .from('profiles')
      .select('leaderboard_opt_in,delete_requested_at')
      .eq('id', users.a.id)
      .single(),
    'soft-locked caller retains own read access',
  )
  check(
    profile.leaderboard_opt_in === false &&
      Date.parse(profile.delete_requested_at) === Date.parse(deletionTime),
    'deletion atomically withdraws visibility and stamps lock',
  )

  const events = success(
    await a.from('profile_consent_events').select(eventColumns).order('id', { ascending: true }),
    'soft-locked caller retains consent-history access',
  )
  const lastEvent = events.at(-1)
  check(
    events.length === 4 &&
      lastEvent.action === 'withdrawn' &&
      lastEvent.source === 'account_deletion' &&
      lastEvent.notice_version === '2026-08-26',
    'deletion records exactly one trusted withdrawal event',
  )

  const deletionRetry = success(
    await a.rpc('request_account_deletion', { p_expected_user_id: users.a.id }),
    'deletion retry succeeds idempotently',
  )
  check(
    Date.parse(deletionRetry) === Date.parse(deletionTime),
    'deletion retry returns original timestamp',
  )
  check(
    success(
      await a.from('profile_consent_events').select('id'),
      'history remains readable after deletion retry',
    ).length === 4,
    'deletion retry creates no duplicate event',
  )
  blocked(
    await a
      .from('profiles')
      .update({ display_name: 'Should Not Persist' })
      .eq('id', users.a.id)
      .select('id'),
    'deletion lock blocks later profile writes',
  )
  check(
    Boolean(
      (
        await a.rpc('upsert_case_progress', {
          p_case_id: 'case-after-delete',
          p_completed_objectives: ['obj-x'],
        })
      ).error,
    ),
    'deletion lock blocks later progress writes',
  )
  check(
    success(
      await anon.from('leaderboard').select('username').eq('username', users.a.username),
      'leaderboard remains readable after deletion request',
    ).length === 0,
    'deletion-requested user stays absent from leaderboard',
  )
}

function oauthClaimsSql(authenticatedUserId, expectedUserId, timestampSql) {
  return [
    'begin;',
    "select set_config('request.jwt.claims', jsonb_build_object(",
    `  'sub', '${authenticatedUserId}',`,
    "  'role', 'authenticated',",
    "  'amr', jsonb_build_array(jsonb_build_object(",
    "    'method', 'oauth',",
    `    'timestamp', ${timestampSql}`,
    '  ))',
    ')::text, true);',
    `select public.request_account_deletion('${expectedUserId}'::uuid);`,
    'commit;',
  ].join('\n')
}

async function verifyOAuthDeletionAmr() {
  let staleRejected = false
  try {
    await sql(
      oauthClaimsSql(
        users.b.id,
        users.b.id,
        'extract(epoch from statement_timestamp())::bigint - 301',
      ),
    )
  } catch {
    staleRejected = true
  }
  check(staleRejected, 'deletion RPC rejects an OAuth AMR older than five minutes')

  let switchedUserRejected = false
  try {
    await sql(
      oauthClaimsSql(users.b.id, users.a.id, 'extract(epoch from statement_timestamp())::bigint'),
    )
  } catch {
    switchedUserRejected = true
  }
  check(switchedUserRejected, 'deletion RPC rejects a session switched to another user')

  await sql(
    oauthClaimsSql(users.b.id, users.b.id, 'extract(epoch from statement_timestamp())::bigint'),
  )
  const rows = await sql(
    [
      'select delete_requested_at',
      'from public.profiles',
      `where id = '${users.b.id}'::uuid;`,
    ].join('\n'),
  )
  check(
    typeof rows[0]?.delete_requested_at === 'string' &&
      !Number.isNaN(Date.parse(rows[0].delete_requested_at)),
    'recent OAuth AMR soft-locks only its auth.uid profile',
  )
}

async function run() {
  await verifySchema()
  await gate.createUsers()

  const a = browserClient()
  const b = browserClient()
  const anon = browserClient()
  const sessionA = await signIn(a, users.a, 'user A signs in to its own confirmed account')
  await signIn(b, users.b, 'user B signs in to its own confirmed account')

  const claimsA = JSON.parse(
    Buffer.from(sessionA.access_token.split('.')[1], 'base64url').toString('utf8'),
  )
  check(
    Array.isArray(claimsA.amr) && claimsA.amr.some((entry) => entry.method === 'password'),
    'password session contains recent-auth AMR',
  )

  await verifyProfiles(a, b, anon)
  await verifyProgress(a, b, anon)
  await verifyProgressQuota(b)
  const eventColumns = await verifyGrantAndPublicViews(a, b, anon)
  await verifyRankAndUsername(a, b, anon)
  await verifyWithdrawalAndBinding(a, b, anon, eventColumns)
  await verifyConsentQuota(b)
  await verifyDeletion(a, anon, eventColumns)
  await verifyOAuthDeletionAmr()
}

let failure
try {
  await run()
} catch (error) {
  failure = error
  console.error(error instanceof Error ? error.message : String(error))
}

try {
  await gate.cleanup()
} catch (error) {
  failure ??= error
  console.error(error instanceof Error ? error.message : String(error))
}

if (failure) {
  process.exitCode = 1
} else {
  console.log(`RLS_MATRIX_PASS assertions=${gate.assertionCount()}`)
}
