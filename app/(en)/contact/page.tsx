import type { Metadata } from 'next'
import { pageAlternates } from '@/app/localeMeta'
import { ContactBody } from './ContactBody'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Reach the SQL Heist crew: report a bug, ask a question, or leave word.',
  alternates: pageAlternates('/contact', 'en'),
}

export default function ContactPage() {
  return <ContactBody locale="en" />
}
