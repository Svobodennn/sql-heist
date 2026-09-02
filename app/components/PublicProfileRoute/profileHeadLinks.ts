import { SITE_URL } from '@/app/siteConfig'
import { publicProfileHref, type PublicProfilePath } from '@/features/profile/lib/publicProfilePath'
import { LOCALES } from '@/i18n/config'

interface HeadLinkDescriptor {
  readonly rel: 'alternate' | 'canonical'
  readonly href: string
  readonly hrefLang?: string
}

function installHeadLink({ rel, href, hrefLang }: HeadLinkDescriptor): () => void {
  const selector = hrefLang ? `link[rel="${rel}"][hreflang="${hrefLang}"]` : `link[rel="${rel}"]`
  const existing = document.head.querySelector<HTMLLinkElement>(selector)
  const link = existing ?? document.createElement('link')
  const previousHref = existing?.getAttribute('href') ?? null
  const previousHrefLang = existing?.getAttribute('hreflang') ?? null

  link.rel = rel
  link.href = new URL(href, SITE_URL).href
  if (hrefLang) link.setAttribute('hreflang', hrefLang)
  if (!existing) document.head.append(link)

  return () => {
    if (!existing) {
      link.remove()
      return
    }
    if (previousHref === null) link.removeAttribute('href')
    else link.setAttribute('href', previousHref)
    if (previousHrefLang === null) link.removeAttribute('hreflang')
    else link.setAttribute('hreflang', previousHrefLang)
  }
}

export function installPublicProfileHeadLinks(profilePath: PublicProfilePath): () => void {
  const englishPath = publicProfileHref(profilePath.username, 'en')
  const descriptors: readonly HeadLinkDescriptor[] = [
    { rel: 'canonical', href: profilePath.canonicalPath },
    { rel: 'alternate', hrefLang: 'x-default', href: englishPath },
    ...LOCALES.map((locale) => ({
      rel: 'alternate' as const,
      hrefLang: locale,
      href: publicProfileHref(profilePath.username, locale),
    })),
  ]
  const cleanups = descriptors.map(installHeadLink)
  return () => [...cleanups].reverse().forEach((cleanup) => cleanup())
}
