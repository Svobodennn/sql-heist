import type { Metadata } from 'next'
import { pageMeta } from '@/app/localeMeta'
import { TermsBody } from './TermsBody'

export const metadata: Metadata = pageMeta('/terms', 'en', {
  title: 'Terms of Use',
  description:
    'The terms for using SQL Heist: an educational game. Use the skills only on systems you own or are authorised to test.',
})

export default function TermsPage() {
  return <TermsBody locale="en" />
}
