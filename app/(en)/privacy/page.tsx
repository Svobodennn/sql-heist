import type { Metadata } from 'next'
import { pageMeta } from '@/app/localeMeta'
import { PrivacyBody } from './PrivacyBody'

export const metadata: Metadata = pageMeta('/privacy', 'en', {
  title: 'Privacy',
  description:
    'How SQL Heist handles anonymous local play and optional account data, progress sync, public profiles, and deletion requests.',
})

export default function PrivacyPage() {
  return <PrivacyBody locale="en" />
}
