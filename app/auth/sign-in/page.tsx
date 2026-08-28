import type { Metadata } from 'next'
import { SignInForm } from '@/features/auth'
import { pageAlternates } from '../../localeMeta'

export const metadata: Metadata = {
  title: 'Sign in',
  alternates: pageAlternates('/auth/sign-in', 'en'),
}

export default function SignInPage() {
  return <SignInForm />
}
