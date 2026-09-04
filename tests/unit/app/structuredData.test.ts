import { describe, expect, it } from 'vitest'
import { buildBreadcrumbList } from '@/app/structuredData'

describe('buildBreadcrumbList', () => {
  it('builds absolute locale-aware breadcrumb URLs without mutating the input', () => {
    const items = Object.freeze([
      Object.freeze({ name: 'Ana sayfa', path: '/' }),
      Object.freeze({ name: 'İşler', path: '/cases' }),
    ])

    expect(buildBreadcrumbList('tr', items)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Ana sayfa',
          item: 'https://sqlheist.com/tr',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'İşler',
          item: 'https://sqlheist.com/tr/cases',
        },
      ],
    })
    expect(items).toEqual([
      { name: 'Ana sayfa', path: '/' },
      { name: 'İşler', path: '/cases' },
    ])
  })

  it('rejects incomplete or unsafe breadcrumb trails', () => {
    expect(() => buildBreadcrumbList('en', [{ name: 'Home', path: '/' }])).toThrow(
      'BreadcrumbList requires at least two items',
    )
    expect(() =>
      buildBreadcrumbList('en', [
        { name: 'Home', path: '/' },
        { name: 'Help', path: '/help?source=nav' },
      ]),
    ).toThrow('Breadcrumb paths must be safe root-relative paths without query or hash')
    expect(() =>
      buildBreadcrumbList('en', [
        { name: 'Home', path: '/' },
        { name: 'External', path: '//evil.example' },
      ]),
    ).toThrow('Breadcrumb paths must be safe root-relative paths without query or hash')
    expect(() =>
      buildBreadcrumbList('en', [
        { name: 'Home', path: '/' },
        { name: 'External', path: '/\\evil.example' },
      ]),
    ).toThrow('Breadcrumb paths must be safe root-relative paths without query or hash')
  })
})
