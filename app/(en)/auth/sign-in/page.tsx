import type { Metadata } from 'next'
import { SignInForm } from '@/features/auth'
import { pageAlternates } from '@/app/localeMeta'

export const metadata: Metadata = {
  title: 'Sign in',
  alternates: pageAlternates('/auth/sign-in', 'en'),
  robots: { index: false, follow: true },
}

export default function SignInPage() {
  return <SignInForm />
}
