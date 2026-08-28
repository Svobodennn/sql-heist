import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nContext } from '@/i18n/I18nProvider'
import { createTranslator } from '@/i18n/translate'
import en from '@/messages/en.json'
import tr from '@/messages/tr.json'

const { signInOAuthMock } = vi.hoisted(() => ({ signInOAuthMock: vi.fn() }))

vi.mock('@/features/auth/authClient', () => ({ signInOAuth: signInOAuthMock }))

import { OAuthButtons } from '@/features/auth/OAuthButtons'

function renderButtons(locale: 'en' | 'tr' = 'en') {
  const messages = locale === 'tr' ? tr : en
  return render(
    <I18nContext.Provider value={{ locale, setLocale: vi.fn(), t: createTranslator(messages, en) }}>
      <OAuthButtons returnTo="/account" />
    </I18nContext.Provider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('<OAuthButtons>', () => {
  it('starts Google and GitHub sign-in with the requested internal return route', async () => {
    signInOAuthMock.mockResolvedValue({})
    renderButtons()

    expect(screen.getByText(/same verified email/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Privacy notice' }).getAttribute('href')).toBe(
      '/privacy',
    )
    expect(screen.getByRole('link', { name: 'Terms of Use' }).getAttribute('href')).toBe('/terms')

    const googleButton = screen.getByRole('button', { name: 'Continue with Google' })
    expect(googleButton.querySelector('[aria-hidden="true"]')).toBeTruthy()
    fireEvent.click(googleButton)
    await waitFor(() =>
      expect(signInOAuthMock).toHaveBeenCalledWith('google', {
        purpose: 'sign-in',
        returnTo: '/account',
      }),
    )

    cleanup()
    renderButtons()
    const githubButton = screen.getByRole('button', { name: 'Continue with GitHub' })
    const githubMark = githubButton.querySelector('svg[aria-hidden="true"]')
    expect(githubMark).toBeTruthy()
    expect(githubMark?.getAttribute('focusable')).toBe('false')
    fireEvent.click(githubButton)
    await waitFor(() =>
      expect(signInOAuthMock).toHaveBeenCalledWith('github', {
        purpose: 'sign-in',
        returnTo: '/account',
      }),
    )
  })

  it('keeps the provider disclosure links in the active locale', () => {
    signInOAuthMock.mockResolvedValue({})
    renderButtons('tr')

    expect(
      screen.getByRole('link', { name: 'Gizlilik ve KVKK Aydınlatma Metni' }).getAttribute('href'),
    ).toBe('/tr/privacy')
    expect(screen.getByRole('link', { name: 'Kullanım Koşulları' }).getAttribute('href')).toBe(
      '/tr/terms',
    )
  })

  it('shows a non-provider-specific error without blocking the email form', async () => {
    signInOAuthMock.mockResolvedValue({ error: 'generic' })
    renderButtons()

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Something went wrong. Try again.')
    expect(
      (screen.getByRole('button', { name: 'Continue with GitHub' }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })
})
