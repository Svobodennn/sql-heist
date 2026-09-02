import type { Locale } from '@/i18n/config'
import { localeHref } from '@/i18n/localeHref'
import { SITE_URL } from './siteConfig'

export interface BreadcrumbItem {
  readonly name: string
  readonly path: string
}

function validateBreadcrumbItem({ name, path }: BreadcrumbItem): void {
  if (!name.trim()) throw new Error('Breadcrumb names must not be empty')
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#')
  ) {
    throw new Error(
      `Breadcrumb paths must be safe root-relative paths without query or hash: ${path}`,
    )
  }
}

export function buildBreadcrumbList(
  locale: Locale,
  items: readonly BreadcrumbItem[],
): Record<string, unknown> {
  if (items.length < 2) throw new Error('BreadcrumbList requires at least two items')

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      validateBreadcrumbItem(item)
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: new URL(localeHref(item.path, locale), SITE_URL).href,
      }
    }),
  }
}
