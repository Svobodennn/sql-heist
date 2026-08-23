import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProfileView } from '@/features/profile'

export const metadata: Metadata = {
  title: 'Operative profile',
  description: 'A public SQL Heist operative dossier.',
}

export default function PublicProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileView />
    </Suspense>
  )
}
