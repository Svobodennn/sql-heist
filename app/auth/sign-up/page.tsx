import type { Metadata } from 'next'
import { SignUpForm } from '@/features/auth'
import { pageAlternates } from '../../localeMeta'

export const metadata: Metadata = {
  title: 'Create account',
  alternates: pageAlternates('/auth/sign-up', 'en'),
}

export default function SignUpPage() {
  return <SignUpForm />
}
