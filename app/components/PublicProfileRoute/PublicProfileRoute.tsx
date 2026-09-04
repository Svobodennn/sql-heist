'use client'

import { useEffect, useState } from 'react'
import { ProfileView } from '@/features/profile'
import { parsePublicProfilePath } from '@/features/profile/lib/publicProfilePath'
import { installPublicProfileHeadLinks } from './profileHeadLinks'

export function PublicProfileRoute() {
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const profilePath = parsePublicProfilePath(window.location.pathname)
    setUsername(profilePath?.username ?? '')
    if (!profilePath) return
    return installPublicProfileHeadLinks(profilePath)
  }, [])

  return <ProfileView username={username} />
}
