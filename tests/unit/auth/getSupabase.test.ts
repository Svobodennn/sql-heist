import { afterEach, describe, expect, it, vi } from 'vitest'

// lib/supabase reads NEXT_PUBLIC_* at module scope (Next inlines them at build
// time), so every case resets the module registry and shapes env BEFORE importing.
const URL = 'https://example.supabase.co'
const KEY = 'sb_publishable_test_key'

const saved = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

function setEnv(url?: string, key?: string) {
  if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = url
  if (key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = key
}

async function importFresh() {
  vi.resetModules()
  return import('@/lib/supabase')
}

afterEach(() => {
  setEnv(saved.url, saved.key)
})

describe('getSupabase env guard', () => {
  it('returns null (and stays null) when env is absent — auth cleanly off', async () => {
    setEnv(undefined, undefined)
    const mod = await importFresh()
    expect(mod.isSupabaseConfigured()).toBe(false)
    expect(mod.getSupabase()).toBeNull()
    expect(mod.getSupabase()).toBeNull()
  })

  it('returns null when only one of the two values is present', async () => {
    setEnv(URL, undefined)
    const urlOnly = await importFresh()
    expect(urlOnly.isSupabaseConfigured()).toBe(false)
    expect(urlOnly.getSupabase()).toBeNull()

    setEnv(undefined, KEY)
    const keyOnly = await importFresh()
    expect(keyOnly.isSupabaseConfigured()).toBe(false)
    expect(keyOnly.getSupabase()).toBeNull()
  })

  it('with env present builds ONE cached client (singleton)', async () => {
    setEnv(URL, KEY)
    const mod = await importFresh()
    expect(mod.isSupabaseConfigured()).toBe(true)
    const first = mod.getSupabase()
    expect(first).not.toBeNull()
    expect(mod.getSupabase()).toBe(first)
  })
})
