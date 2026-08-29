import { describe, expect, it } from 'vitest'
import { artworkForCase } from '@/features/game/components/CaseCard/caseArtwork'

describe('case artwork mapping', () => {
  it.each([
    ['the-front-door', '/cinematic-breach/case-front-door.webp'],
    ['the-quiet-room', '/cinematic-breach/case-quiet-room.webp'],
    ['the-vault', '/cinematic-breach/case-vault.webp'],
  ])('maps %s to a production-owned asset', (caseId, expected) => {
    expect(artworkForCase(caseId)).toBe(expected)
  })

  it('returns no decorative image for an unknown case instead of mislabeling it', () => {
    expect(artworkForCase('unknown-case')).toBeNull()
  })
})
