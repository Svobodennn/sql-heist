import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getPublicProfileMock } = vi.hoisted(() => ({
  getPublicProfileMock: vi.fn(),
}))

vi.mock('@/features/profile/lib/profileQuery', () => ({
  getPublicProfile: getPublicProfileMock,
}))

import { PublicProfileRoute } from '@/app/components/PublicProfileRoute'

afterEach(cleanup)

beforeEach(() => {
  getPublicProfileMock.mockReset()
  document.head
    .querySelectorAll('link[rel="canonical"], link[rel="alternate"]')
    .forEach((link) => link.remove())
})

describe('<PublicProfileRoute>', () => {
  it('reads a clean localized path, fetches the normalized username, and sets its canonical', async () => {
    window.history.replaceState({}, '', '/tr/user/Ada_L')
    getPublicProfileMock.mockResolvedValue(null)

    render(<PublicProfileRoute />)

    await waitFor(() => expect(getPublicProfileMock).toHaveBeenCalledWith('ada_l'))
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://sqlheist.com/tr/user/ada_l',
    )
    expect(
      [...document.head.querySelectorAll('link[rel="alternate"]')].map((link) => [
        link.getAttribute('hreflang'),
        link.getAttribute('href'),
      ]),
    ).toEqual([
      ['x-default', 'https://sqlheist.com/user/ada_l'],
      ['en', 'https://sqlheist.com/user/ada_l'],
      ['tr', 'https://sqlheist.com/tr/user/ada_l'],
      ['pl', 'https://sqlheist.com/pl/user/ada_l'],
    ])
  })

  it('does not fetch or trust an invalid path segment', async () => {
    window.history.replaceState({}, '', '/user/%3Cscript%3E')

    render(<PublicProfileRoute />)

    await screen.findByText('No operative specified')
    expect(getPublicProfileMock).not.toHaveBeenCalled()
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelector('link[rel="alternate"]')).toBeNull()
    expect(document.querySelector('script')).toBeNull()
  })

  it('restores existing head metadata when the route unmounts', async () => {
    window.history.replaceState({}, '', '/user/ada_l')
    getPublicProfileMock.mockResolvedValue(null)
    const previousCanonical = document.createElement('link')
    previousCanonical.rel = 'canonical'
    previousCanonical.href = 'https://sqlheist.com/previous'
    document.head.append(previousCanonical)

    const view = render(<PublicProfileRoute />)
    await waitFor(() => expect(getPublicProfileMock).toHaveBeenCalledWith('ada_l'))
    expect(previousCanonical.href).toBe('https://sqlheist.com/user/ada_l')

    view.unmount()

    expect(previousCanonical.href).toBe('https://sqlheist.com/previous')
    expect(document.head.querySelector('link[rel="alternate"]')).toBeNull()
  })
})
