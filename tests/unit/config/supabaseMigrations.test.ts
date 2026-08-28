import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDirectory = path.join(process.cwd(), 'supabase', 'migrations')

describe('Supabase migration history', () => {
  it('starts with a replayable auth schema before dependent migrations', () => {
    const migrations = readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith('.sql'))
      .sort()
    const baseline = migrations.find((file) => file.endsWith('_auth_core.sql'))

    expect(baseline).toBeDefined()
    expect(baseline).toBe(migrations[0])

    const sql = readFileSync(path.join(migrationsDirectory, baseline ?? ''), 'utf8')
    expect(sql).toContain("if to_regclass('public.profiles') is null then")
    expect(sql).toContain("if to_regclass('public.case_progress') is null then")
    expect(sql).toContain('if created_profiles then')
    expect(sql).toContain('create table public.profiles')
    expect(sql).toContain('create table public.case_progress')
    expect(sql).toContain('country text')
    expect(sql).toContain('constraint display_name_bounded')
    expect(sql).toContain('constraint case_id_bounded')
    expect(sql).toContain('constraint objectives_bounded')
    expect(sql).toContain('alter table public.profiles enable row level security')
    expect(sql).toContain('alter table public.case_progress enable row level security')
    expect(sql).toContain('create policy profiles_select_own')
    expect(sql).toContain('create policy cp_select_own')
  })
})
