import type { Metadata } from 'next'
import { pageAlternates } from '@/app/localeMeta'
import { FaqBody } from './FaqBody'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Straight answers about SQL Heist: is it legal, do you need to install anything, where your progress is saved, and who this is for.',
  alternates: pageAlternates('/faq', 'en'),
}

export default function FaqPage() {
  return <FaqBody locale="en" />
}
