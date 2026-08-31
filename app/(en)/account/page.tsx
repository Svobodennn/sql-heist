import type { Metadata } from 'next'
import { AccountPanel } from '@/features/profile'
import { pageAlternates } from '@/app/localeMeta'

export const metadata: Metadata = {
  title: 'Account',
  alternates: pageAlternates('/account', 'en'),
}

export default function AccountPage() {
  return <AccountPanel />
}
