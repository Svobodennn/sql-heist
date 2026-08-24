import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher'
import { I18nContext } from '@/i18n/I18nProvider'
import { createTranslator } from '@/i18n/translate'
import en from '@/messages/en.json'

const { pathnameMock, pushMock, setLocaleMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
  pushMock: vi.fn(),
  setLocaleMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: pathnameMock,
  useRouter: () => ({ push: pushMock }),
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
    pushMock.mockReset()
    setLocaleMock.mockReset()
    window.history.replaceState({}, '', '/')
  })

  afterEach(cleanup)

  it('preserves a public profile query while switching to a localized route', () => {
    pathnameMock.mockReturnValue('/u')
    window.history.replaceState({}, '', '/u?name=ada_l')
    renderSwitcher()

    choose('Türkçe')

    expect(setLocaleMock).toHaveBeenCalledWith('tr')
    expect(pushMock).toHaveBeenCalledWith('/tr/u?name=ada_l')
  })

  it('keeps the Supabase callback canonical and preserves its query and hash', () => {
    pathnameMock.mockReturnValue('/auth/callback')
    window.history.replaceState({}, '', '/auth/callback?code=secret#complete')
    renderSwitcher()

    choose('Polski')

    expect(setLocaleMock).toHaveBeenCalledWith('pl')
    expect(pushMock).toHaveBeenCalledWith('/auth/callback?code=secret#complete')
  })
})
