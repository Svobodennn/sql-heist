import { describe, expect, it } from 'vitest'
import { pageAlternates } from '@/app/localeMeta'
import { metadata as accountMetadata } from '@/app/account/page'
import { metadata as leaderboardMetadata } from '@/app/leaderboard/page'
import { metadata as publicProfileMetadata } from '@/app/u/page'
import { metadata as signInMetadata } from '@/app/auth/sign-in/page'
import { metadata as signUpMetadata } from '@/app/auth/sign-up/page'
import { generateMetadata as localizedSignInMetadata } from '@/app/[locale]/auth/sign-in/page'
import { generateMetadata as localizedSignUpMetadata } from '@/app/[locale]/auth/sign-up/page'

describe('account route metadata', () => {
  it('gives every English account surface a self-canonical language map', () => {
    expect(accountMetadata.alternates).toEqual(pageAlternates('/account', 'en'))
    expect(leaderboardMetadata.alternates).toEqual(pageAlternates('/leaderboard', 'en'))
    expect(publicProfileMetadata.alternates).toEqual(pageAlternates('/u', 'en'))
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
})
