import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProfileView } from '@/features/profile'
import { pageMeta } from '@/app/localeMeta'

export const metadata: Metadata = pageMeta('/u', 'en', {
  title: 'Operative profile',
  description: 'A public SQL Heist operative dossier.',
})

export default function PublicProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileView />
    </Suspense>
  )
}
