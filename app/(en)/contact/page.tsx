import type { Metadata } from 'next'
import { pageMeta } from '@/app/localeMeta'
import { ContactBody } from './ContactBody'

export const metadata: Metadata = pageMeta('/contact', 'en', {
  title: 'Contact',
  description: 'Reach the SQL Heist crew: report a bug, ask a question, or leave word.',
})

export default function ContactPage() {
  return <ContactBody locale="en" />
}
