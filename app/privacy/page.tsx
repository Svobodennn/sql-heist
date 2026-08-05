import type { Metadata } from 'next'
import { pageAlternates } from '../localeMeta'
import { PrivacyBody } from './PrivacyBody'

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'How SQL Heist handles your data: no accounts, no tracking, progress stored locally in your browser. It runs entirely client-side.',
  alternates: pageAlternates('/privacy', 'en'),
}

export default function PrivacyPage() {
  return <PrivacyBody locale="en" />
}
