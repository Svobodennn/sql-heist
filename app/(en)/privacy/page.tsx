import type { Metadata } from 'next'
import { pageAlternates } from '@/app/localeMeta'
import { PrivacyBody } from './PrivacyBody'

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'How SQL Heist handles anonymous local play and optional account data, progress sync, public profiles, and deletion requests.',
  alternates: pageAlternates('/privacy', 'en'),
}

export default function PrivacyPage() {
  return <PrivacyBody locale="en" />
}
