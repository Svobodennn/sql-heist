'use client'

import { preload } from 'react-dom'

export function HeroImagePreload() {
  preload('/hero-vault-brass.webp', { as: 'image', fetchPriority: 'high' })
  return null
}
