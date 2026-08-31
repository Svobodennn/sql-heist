import type { Metadata } from 'next'
import { HelpBody } from './HelpBody'
import { pageAlternates } from '@/app/localeMeta'

export const metadata: Metadata = {
  title: 'How the job works',
  description:
    'How to play SQL Heist: five moves per job — Brief, Recon, Exploit, Loot, Debrief. Read the wire, run your payload, learn the fix.',
  alternates: pageAlternates('/help', 'en'),
}

export default function HelpPage() {
  return <HelpBody locale="en" />
}
