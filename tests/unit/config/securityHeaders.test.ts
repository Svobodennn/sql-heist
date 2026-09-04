import { describe, expect, it } from 'vitest'
import vercelConfig from '@/vercel.json'

describe('deployment security headers', () => {
  it('maps every locale-aware public-profile URL to its emitted static shell', () => {
    expect(vercelConfig.rewrites).toEqual([
      { source: '/user/:username', destination: '/user/profile-shell' },
      { source: '/tr/user/:username', destination: '/tr/user/profile-shell' },
      { source: '/pl/user/:username', destination: '/pl/user/profile-shell' },
    ])
  })

  it('blocks framing and applies the static-site hardening baseline to every route', () => {
    const route = vercelConfig.headers.find((entry) => entry.source === '/(.*)')
    const headers = Object.fromEntries(
      (route?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value]),
    )

    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(headers['content-security-policy']).toContain("base-uri 'self'")
    expect(headers['content-security-policy']).toContain("object-src 'none'")
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()')
  })
})
