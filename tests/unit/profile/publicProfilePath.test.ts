import { describe, expect, it } from 'vitest'
import { parsePublicProfilePath, publicProfileHref } from '@/features/profile/lib/publicProfilePath'

describe('public profile paths', () => {
  it('writes encoded clean paths in every supported locale', () => {
    expect(publicProfileHref('Ada_L', 'en')).toBe('/user/ada_l')
    expect(publicProfileHref('Ada_L', 'tr')).toBe('/tr/user/ada_l')
    expect(publicProfileHref('Ada_L', 'pl')).toBe('/pl/user/ada_l')
  })

  it('parses and canonicalizes exact public-profile paths', () => {
    expect(parsePublicProfilePath('/user/Ada_L')).toEqual({
      locale: 'en',
      username: 'ada_l',
      canonicalPath: '/user/ada_l',
    })
    expect(parsePublicProfilePath('/tr/user/neo')).toEqual({
      locale: 'tr',
      username: 'neo',
      canonicalPath: '/tr/user/neo',
    })
  })

  it('rejects malformed, traversal-shaped, and extra-segment paths', () => {
    expect(parsePublicProfilePath('/user/ab')).toBeNull()
    expect(parsePublicProfilePath('/user/%3Cscript%3E')).toBeNull()
    expect(parsePublicProfilePath('/user/ada_l/redirect')).toBeNull()
    expect(parsePublicProfilePath('/user/%E0%A4%A')).toBeNull()
    expect(parsePublicProfilePath('/help')).toBeNull()
  })
})
