const CASE_ARTWORK = {
  'the-front-door': '/cinematic-breach/case-front-door.webp',
  'the-quiet-room': '/cinematic-breach/case-quiet-room.webp',
  'the-vault': '/cinematic-breach/case-vault.webp',
} as const

export function artworkForCase(caseId: string): string | null {
  return CASE_ARTWORK[caseId as keyof typeof CASE_ARTWORK] ?? null
}
