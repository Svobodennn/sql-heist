import type { Metadata } from 'next'
import { SignUpForm } from '@/features/auth'
import { pageAlternates } from '@/app/localeMeta'

export const metadata: Metadata = {
  title: 'Create account',
  alternates: pageAlternates('/auth/sign-up', 'en'),
  robots: { index: false, follow: true },
}

export default function SignUpPage() {
  return <SignUpForm />
}
