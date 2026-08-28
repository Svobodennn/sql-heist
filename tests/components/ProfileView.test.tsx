import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nContext } from '@/i18n/I18nProvider'
import en from '@/messages/en.json'
import tr from '@/messages/tr.json'
import { createTranslator } from '@/i18n/translate'

const { getPublicProfileMock, query } = vi.hoisted(() => ({
  getPublicProfileMock: vi.fn(),
  query: { name: '' },
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => (key === 'name' ? query.name : null) }),
}))

vi.mock('@/features/profile/lib/profileQuery', () => ({
  getPublicProfile: getPublicProfileMock,
}))

import { ProfileView } from '@/features/profile/ProfileView'

afterEach(cleanup)

beforeEach(() => {
  query.name = ''
  getPublicProfileMock.mockReset()
})

describe('<ProfileView>', () => {
  it('asks for a username when the query parameter is empty', () => {
    render(<ProfileView />)
    expect(screen.getByText('No operative specified')).toBeTruthy()
    expect(getPublicProfileMock).not.toHaveBeenCalled()
  })

  it('uses one indistinguishable state for private and missing profiles', async () => {
    query.name = 'hidden'
    getPublicProfileMock.mockResolvedValue(null)
    render(<ProfileView />)

    await waitFor(() => expect(screen.getByText('Private or not found')).toBeTruthy())
    expect(getPublicProfileMock).toHaveBeenCalledWith('hidden')
  })

  it('renders only the safe public fields returned by the curated view', async () => {
    query.name = 'ada_l'
    getPublicProfileMock.mockResolvedValue({
      username: 'ada_l',
      displayName: 'Ada',
      createdAt: '2026-08-22T00:00:00.000Z',
      objectivesCleared: 7,
    })
    render(<ProfileView />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ada' })).toBeTruthy())
    expect(screen.getByText('@ada_l')).toBeTruthy()
    expect(screen.queryByText('Country')).toBeNull()
    expect(screen.queryByText('United Kingdom')).toBeNull()
    expect(screen.getByText('7')).toBeTruthy()
    expect(document.body.textContent).not.toContain('user-1')
    expect(document.body.textContent).not.toContain('@example.com')
  })

  it('renders a hostile display name as text instead of HTML', async () => {
    query.name = 'ada_l'
    getPublicProfileMock.mockResolvedValue({
      username: 'ada_l',
      displayName: '<img src=x onerror=alert(1)>',
      createdAt: '2026-08-22T00:00:00.000Z',
      objectivesCleared: 7,
    })
    render(<ProfileView />)

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: '<img src=x onerror=alert(1)>' })).toBeTruthy(),
    )
    expect(document.querySelector('img')).toBeNull()
  })

  it('renders a generic unavailable state when the request fails', async () => {
    query.name = 'ada_l'
    getPublicProfileMock.mockRejectedValue(new Error('database detail'))
    render(<ProfileView />)

    await waitFor(() => expect(screen.getByText("Couldn't open this dossier")).toBeTruthy())
    expect(document.body.textContent).not.toContain('database detail')
  })

  it('does not show the previous profile after query-string navigation', async () => {
    query.name = 'ada_l'
    getPublicProfileMock.mockResolvedValueOnce({
      username: 'ada_l',
      displayName: 'Ada',
      createdAt: '2026-08-22T00:00:00.000Z',
      objectivesCleared: 7,
    })
    const nextProfile = new Promise(() => {})
    getPublicProfileMock.mockReturnValueOnce(nextProfile)
    const view = render(<ProfileView />)
    await screen.findByText('@ada_l')

    query.name = 'grace_h'
    view.rerender(<ProfileView />)

    expect(screen.queryByText('@ada_l')).toBeNull()
    expect(screen.getByText('Opening dossier…')).toBeTruthy()
  })

  it('keeps the empty-state case link inside the active locale', () => {
    render(
      <I18nContext.Provider
        value={{ locale: 'tr', setLocale: vi.fn(), t: createTranslator(tr, en) }}
      >
        <ProfileView />
      </I18nContext.Provider>,
    )

    expect(screen.getByRole('link', { name: 'İşlere göz at' }).getAttribute('href')).toBe(
      '/tr/cases',
    )
  })
})
