import type { Metadata } from 'next'
import { pageAlternates } from '../localeMeta'
import { TermsBody } from './TermsBody'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'The terms for using SQL Heist: an educational game. Use the skills only on systems you own or are authorised to test.',
  alternates: pageAlternates('/terms', 'en'),
}

export default function TermsPage() {
  return <TermsBody locale="en" />
}
