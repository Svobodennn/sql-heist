import type { Metadata } from 'next'
import { AccountPanel } from '@/features/profile'
import { pageMeta } from '@/app/localeMeta'

export const metadata: Metadata = {
  ...pageMeta('/account', 'en', {
    title: 'Account',
    description: 'Manage the identity and synced data attached to your SQL Heist account.',
  }),
  robots: { index: false, follow: true },
}

export default function AccountPage() {
  return <AccountPanel />
}
