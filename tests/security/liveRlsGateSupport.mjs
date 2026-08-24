import { execFileSync } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

const { loadEnvConfig } = nextEnv

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function readManagementToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN
  if (process.platform !== 'darwin') return null

  try {
    return execFileSync(
      'security',
      ['find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()
  } catch {
    return null
  }
}

function makeUser(label, emailSuffix, usernameSuffix) {
  return {
    id: randomUUID(),
    identityId: randomUUID(),
    email: `sql-heist-rls-${label}-${emailSuffix}@example.com`,
    password: `Rls${label.toUpperCase()}!${randomBytes(18).toString('base64url')}`,
    username: `rls_${label}_${usernameSuffix}`,
  }
}

export function createLiveGateContext() {
  if (process.env.RUN_LIVE_RLS_GATE !== '1') {
    throw new Error('Refusing live RLS mutation without RUN_LIVE_RLS_GATE=1')
  }

  loadEnvConfig(process.cwd())
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const accessToken = readManagementToken()

  if (!supabaseUrl || !publishableKey || !accessToken) {
    throw new Error('Live RLS gate credentials are unavailable')
  }

  const projectHost = new URL(supabaseUrl).hostname
  const projectRef = projectHost.split('.')[0]
  if (!projectRef || projectHost !== `${projectRef}.supabase.co`) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not a hosted Supabase project URL')
  }

  const emailSuffix = `${Date.now().toString(36)}${randomBytes(5).toString('hex')}`
  const usernameSuffix = randomBytes(5).toString('hex')
  const users = {
    a: makeUser('a', emailSuffix, usernameSuffix),
    b: makeUser('b', emailSuffix, usernameSuffix),
  }
  const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`
  const clients = []
  let assertionCount = 0

  function check(condition, label) {
    if (!condition) throw new Error(`ASSERTION FAILED: ${label}`)
    assertionCount += 1
    console.log(`PASS ${assertionCount} - ${label}`)
  }

  function success(result, label) {
    check(!result.error, label)
    return result.data
  }

  function blocked(result, label) {
    const empty =
      result.data === null || (Array.isArray(result.data) && result.data.length === 0)
    check(Boolean(result.error) || empty, label)
  }

  async function sql(query) {
    const response = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok || !Array.isArray(body)) {
      throw new Error(`Management SQL failed with HTTP ${response.status}`)
    }
    return body
  }

  function browserClient() {
    const client = createClient(supabaseUrl, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    clients.push(client)
    return client
  }

  async function createUsers() {
    const authValues = Object.values(users)
      .map((user) => {
        const values = [
          quote('00000000-0000-0000-0000-000000000000'),
          quote(user.id),
          quote('authenticated'),
          quote('authenticated'),
          quote(user.email),
          `extensions.crypt(${quote(user.password)}, extensions.gen_salt('bf'))`,
          'statement_timestamp()',
          `${quote('{"provider":"email","providers":["email"]}')}::jsonb`,
          `${quote('{}')}::jsonb`,
          'statement_timestamp()',
          'statement_timestamp()',
          quote(''),
          quote(''),
          quote(''),
          quote(''),
          'false',
          'false',
        ]
        return `(${values.join(', ')})`
      })
      .join(',\n')

    const identityValues = Object.values(users)
      .map((user) => {
        const identityData = `jsonb_build_object(${[
          quote('sub'),
          quote(user.id),
          quote('email'),
          quote(user.email),
          quote('email_verified'),
          'true',
          quote('phone_verified'),
          'false',
        ].join(', ')})`
        const values = [
          quote(user.identityId),
          quote(user.email),
          quote(user.id),
          identityData,
          quote('email'),
          'statement_timestamp()',
          'statement_timestamp()',
          'statement_timestamp()',
        ]
        return `(${values.join(', ')})`
      })
      .join(',\n')

    await sql(
      [
        'begin;',
        'insert into auth.users (',
        '  instance_id, id, aud, role, email, encrypted_password,',
        '  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,',
        '  created_at, updated_at, confirmation_token, recovery_token,',
        '  email_change_token_new, email_change, is_sso_user, is_anonymous',
        ') values',
        `${authValues};`,
        'insert into auth.identities (',
        '  id, provider_id, user_id, identity_data, provider, last_sign_in_at,',
        '  created_at, updated_at',
        ') values',
        `${identityValues};`,
        'commit;',
      ].join('\n'),
    )
  }

  async function cleanup() {
    for (const client of clients) await client.auth.signOut().catch(() => {})

    const idList = Object.values(users)
      .map((user) => quote(user.id))
      .join(', ')
    await sql(
      [
        `delete from auth.identities where user_id in (${idList});`,
        `delete from auth.users where id in (${idList});`,
      ].join('\n'),
    )

    const rows = await sql(
      [
        'select',
        ` (select count(*) from auth.users where id in (${idList}))::int as auth_users,`,
        ` (select count(*) from public.profiles where id in (${idList}))::int as profiles,`,
        ` (select count(*) from public.case_progress where user_id in (${idList}))::int as progress,`,
        ` (select count(*) from public.profile_consent_events where user_id in (${idList}))::int as consent_events`,
      ].join('\n'),
    )
    const remaining = rows[0] ?? {}
    const clean =
      remaining.auth_users === 0 &&
      remaining.profiles === 0 &&
      remaining.progress === 0 &&
      remaining.consent_events === 0
    console.log(`CLEANUP ${clean ? 'PASS' : 'FAIL'}`)
    if (!clean) throw new Error('Disposable-user cleanup left live rows behind')
  }

  return {
    users,
    check,
    success,
    blocked,
    sql,
    browserClient,
    createUsers,
    cleanup,
    assertionCount: () => assertionCount,
  }
}
