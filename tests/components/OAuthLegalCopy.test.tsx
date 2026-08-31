import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PrivacyBody } from '@/app/(en)/privacy/PrivacyBody'
import { TermsBody } from '@/app/(en)/terms/TermsBody'

afterEach(cleanup)

describe('OAuth legal copy', () => {
  it('dates and discloses provider identity processing in the privacy notice', () => {
    render(<PrivacyBody locale="en" />)

    expect(screen.getByText('2026-08-26').getAttribute('datetime')).toBe('2026-08-26')
    expect(document.body.textContent).toContain('Google or GitHub')
    expect(document.body.textContent).toContain('provider identity metadata')
    expect(document.body.textContent).toContain('does not retain provider access or refresh tokens')
    expect(document.body.textContent).toContain('revocation request to Google')
    expect(document.body.textContent).toContain('GitHub authorization may remain')
    expect(document.body.textContent).toContain("GitHub's Authorized OAuth Apps")
    expect(document.body.textContent).toContain('automatically links identities')
  })

  it('dates and explains provider sign-in in the terms', () => {
    render(<TermsBody locale="en" />)

    expect(screen.getByText('2026-08-26').getAttribute('datetime')).toBe('2026-08-26')
    expect(document.body.textContent).toContain('Google or GitHub')
    expect(document.body.textContent).toContain('same verified email')
  })
})
