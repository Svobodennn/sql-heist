import { parsePublicProfilePath } from '@/features/profile/lib/publicProfilePath'

type Navigate = (href: string) => void

export function navigateToLocaleDestination(
  href: string,
  push: Navigate,
  assign: Navigate = (destination) => window.location.assign(destination),
) {
  if (parsePublicProfilePath(href)) {
    assign(href)
    return
  }
  push(href)
}
