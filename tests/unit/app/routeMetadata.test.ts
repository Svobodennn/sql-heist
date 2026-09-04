import { describe, expect, it, vi } from 'vitest'

// The root layouts import AppShell, which pulls in next/font (a build-time macro
// vitest can't transform). We only read their metadata exports, not the component,
// so stub the shell to cut the font chain.
vi.mock('@/app/shell', () => ({ AppShell: () => null }))

import { pageAlternates } from '@/app/localeMeta'
import { SITE_NAME, SITE_TAGLINE } from '@/app/siteConfig'
import { getCase } from '@/features/game/cases'
import { metadata as enRootMetadata } from '@/app/(en)/layout'
import { generateMetadata as localeRootMetadata } from '@/app/[locale]/layout'
import { metadata as accountMetadata } from '@/app/(en)/account/page'
import { metadata as caseBoardMetadata } from '@/app/(en)/cases/page'
import { generateMetadata as caseMetadata } from '@/app/(en)/cases/[caseId]/page'
import { metadata as helpMetadata } from '@/app/(en)/help/page'
import { metadata as leaderboardMetadata } from '@/app/(en)/leaderboard/page'
import { metadata as publicProfileMetadata } from '@/app/(en)/user/profile-shell/page'
import { metadata as signInMetadata } from '@/app/(en)/auth/sign-in/page'
import { metadata as signUpMetadata } from '@/app/(en)/auth/sign-up/page'
import { generateMetadata as localizedAccountMetadata } from '@/app/[locale]/account/page'
import { generateMetadata as localizedCaseMetadata } from '@/app/[locale]/cases/[caseId]/page'
import { generateMetadata as localizedHelpMetadata } from '@/app/[locale]/help/page'
import { generateMetadata as localizedSignInMetadata } from '@/app/[locale]/auth/sign-in/page'
import { generateMetadata as localizedSignUpMetadata } from '@/app/[locale]/auth/sign-up/page'
import { generateMetadata as localizedPublicProfileMetadata } from '@/app/[locale]/user/profile-shell/page'

describe('route metadata', () => {
  it('gives every English account surface a self-canonical language map', () => {
    expect(accountMetadata.alternates).toEqual(pageAlternates('/account', 'en'))
    expect(leaderboardMetadata.alternates).toEqual(pageAlternates('/leaderboard', 'en'))
    expect(signInMetadata.alternates).toEqual(pageAlternates('/auth/sign-in', 'en'))
    expect(signUpMetadata.alternates).toEqual(pageAlternates('/auth/sign-up', 'en'))
  })

  it('publishes localized sign-in and sign-up metadata', async () => {
    await expect(
      localizedSignInMetadata({ params: Promise.resolve({ locale: 'tr' }) }),
    ).resolves.toMatchObject({ alternates: pageAlternates('/auth/sign-in', 'tr') })
    await expect(
      localizedSignUpMetadata({ params: Promise.resolve({ locale: 'pl' }) }),
    ).resolves.toMatchObject({ alternates: pageAlternates('/auth/sign-up', 'pl') })
  })

  it('keeps private account surfaces out of the index in every locale', async () => {
    const robots = { index: false, follow: true }

    expect(accountMetadata.robots).toEqual(robots)
    expect(signInMetadata.robots).toEqual(robots)
    expect(signUpMetadata.robots).toEqual(robots)
    await expect(
      localizedAccountMetadata({ params: Promise.resolve({ locale: 'tr' }) }),
    ).resolves.toMatchObject({ robots })
    await expect(
      localizedSignInMetadata({ params: Promise.resolve({ locale: 'tr' }) }),
    ).resolves.toMatchObject({ robots })
    await expect(
      localizedSignUpMetadata({ params: Promise.resolve({ locale: 'pl' }) }),
    ).resolves.toMatchObject({ robots })
  })

  it('publishes page-specific social metadata for content, board, and profile routes', async () => {
    expect(helpMetadata.openGraph).toMatchObject({ url: '/help' })
    expect(helpMetadata.twitter).toMatchObject({ title: helpMetadata.title })
    expect(caseBoardMetadata.openGraph).toMatchObject({ url: '/cases' })

    const localizedHelp = await localizedHelpMetadata({
      params: Promise.resolve({ locale: 'tr' }),
    })
    expect(localizedHelp.openGraph).toMatchObject({ url: '/tr/help' })
    expect(localizedHelp.twitter).toMatchObject({ title: localizedHelp.title })
  })

  it('leaves profile canonicals to the clean-path client shell', async () => {
    expect(publicProfileMetadata.alternates).toBeUndefined()
    expect(publicProfileMetadata.openGraph).not.toHaveProperty('url')

    const localized = await localizedPublicProfileMetadata({
      params: Promise.resolve({ locale: 'tr' }),
    })
    expect(localized.alternates).toBeUndefined()
    expect(localized.openGraph).not.toHaveProperty('url')
  })

  it('pins root-layout social images to metadataBase-relative paths in every locale', async () => {
    // Regression guard for F1: the home routes must declare explicit og/twitter
    // images so they resolve against metadataBase (SITE_URL), not the build host.
    const socialAlt = `${SITE_NAME} — ${SITE_TAGLINE}`
    const expectedOg = {
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      type: 'image/png',
      alt: socialAlt,
    }

    expect(enRootMetadata.openGraph?.images).toEqual([expectedOg])
    expect(enRootMetadata.twitter?.images).toEqual([{ ...expectedOg, url: '/twitter-image.png' }])

    for (const locale of ['tr', 'pl'] as const) {
      const meta = await localeRootMetadata({ params: Promise.resolve({ locale }) })
      expect(meta.openGraph?.images).toEqual([expectedOg])
      expect(meta.twitter?.images).toEqual([{ ...expectedOg, url: '/twitter-image.png' }])
    }
  })

  it('publishes matching article and Twitter metadata for case details', async () => {
    const english = await caseMetadata({
      params: Promise.resolve({ caseId: 'the-front-door' }),
    })
    const localized = await localizedCaseMetadata({
      params: Promise.resolve({ locale: 'tr', caseId: 'the-front-door' }),
    })

    expect(english.openGraph).toMatchObject({
      type: 'article',
      url: '/cases/the-front-door',
    })
    expect(english.twitter).toMatchObject({
      title: english.title,
      description: english.description,
    })
    expect(localized.openGraph).toMatchObject({
      type: 'article',
      url: '/tr/cases/the-front-door',
    })
    expect(localized.twitter).toMatchObject({
      title: localized.title,
      description: localized.description,
    })
    expect(localized.description).toBe(getCase('the-front-door', 'tr')?.briefing.text)
    expect(localized.description).not.toBe(getCase('the-front-door', 'en')?.briefing.text)
  })
})
