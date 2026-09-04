import { PublicProfileRoute } from '@/app/components/PublicProfileRoute'
import { publicProfileShellMetadata } from '@/app/publicProfileShellMeta'

export const metadata = publicProfileShellMetadata('en')

export default function PublicProfileShellPage() {
  return <PublicProfileRoute />
}
