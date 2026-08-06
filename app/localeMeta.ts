import type { Locale } from '@/i18n/config'

// Reciprocal hreflang + self-canonical for a page that exists at the unprefixed en
// root and under /tr, /pl. `base` is the path without any locale prefix ('' = home,
// '/help', …). Every variant advertises the same language map + x-default (en), and
// points its canonical at itself — the shape Google wants for alternate pages.
export function pageAlternates(base: string, locale: Locale) {
  const url = (l: Locale) => (l === 'en' ? base || '/' : `/${l}${base}`)
  return {
    canonical: url(locale),
    languages: {
      'x-default': url('en'),
      en: url('en'),
      tr: url('tr'),
      pl: url('pl'),
    },
  }
}
