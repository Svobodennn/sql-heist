import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher'
import { I18nContext } from '@/i18n/I18nProvider'
import { createTranslator } from '@/i18n/translate'
import en from '@/messages/en.json'

const { navigateMock, pathnameMock, pushMock, setLocaleMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  pathnameMock: vi.fn(),
  pushMock: vi.fn(),
  setLocaleMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: pathnameMock,
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/app/components/LanguageSwitcher/localeNavigation', () => ({
  navigateToLocaleDestination: navigateMock,
}))

function renderSwitcher() {
  return render(
    <I18nContext.Provider
      value={{ locale: 'en', setLocale: setLocaleMock, t: createTranslator(en, en) }}
    >
      <LanguageSwitcher />
    </I18nContext.Provider>,
  )
}

function choose(language: 'Türkçe' | 'Polski') {
  fireEvent.click(screen.getByRole('button', { name: 'Language: English' }))
  fireEvent.click(screen.getByRole('button', { name: language }))
}

describe('<LanguageSwitcher>', () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue('/')
    navigateMock.mockReset()
    pushMock.mockReset()
    setLocaleMock.mockReset()
    window.history.replaceState({}, '', '/')
  })

  afterEach(cleanup)

  it('preserves a clean public-profile path while switching locale', () => {
    pathnameMock.mockReturnValue('/user/ada_l')
    window.history.replaceState({}, '', '/user/ada_l')
    renderSwitcher()

    choose('Türkçe')

    expect(setLocaleMock).toHaveBeenCalledWith('tr')
    expect(navigateMock).toHaveBeenCalledWith('/tr/user/ada_l', pushMock)
  })

  it('keeps the Supabase callback canonical and preserves its query and hash', () => {
    pathnameMock.mockReturnValue('/auth/callback')
    window.history.replaceState({}, '', '/auth/callback?code=secret#complete')
    renderSwitcher()

    choose('Polski')

    expect(setLocaleMock).toHaveBeenCalledWith('pl')
    expect(navigateMock).toHaveBeenCalledWith('/auth/callback?code=secret#complete', pushMock)
  })
})
