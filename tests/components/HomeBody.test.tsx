import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HomeBody } from '@/app/HomeBody'

afterEach(cleanup)

describe('<HomeBody> Cinematic Breach production composition', () => {
  it('renders the approved operation, case deck, live SQL proof, and pre-flight FAQ', () => {
    const view = render(<HomeBody locale="en" />)

    expect(view.container.querySelector('[data-home-design="cinematic-breach"]')).not.toBeNull()
    expect(screen.getByText('LIVE FIRE: USERS.SEARCH')).toBeTruthy()
    expect(screen.getByText('EXECUTED SQL')).toBeTruthy()
    expect(screen.getByText('3 ROWS')).toBeTruthy()

    const caseDeck = screen.getByRole('region', { name: /choose the next door/i })
    const caseLinks = within(caseDeck).getAllByRole('link')
    expect(caseLinks.map((link) => link.getAttribute('href'))).toEqual([
      '/cases/the-front-door',
      '/cases/the-quiet-room',
      '/cases/the-vault',
    ])

    expect(screen.getByRole('heading', { name: /practice on live sql/i })).toBeTruthy()
    expect(screen.getByText('VULNERABLE: CONCATENATION')).toBeTruthy()
    expect(screen.getByText('SECURE: PARAMETERIZED QUERY')).toBeTruthy()
    expect(view.container.querySelectorAll('details')).toHaveLength(4)
  })

  it('keeps every case redirect locale-aware', () => {
    render(<HomeBody locale="tr" />)

    const caseDeck = screen.getByRole('region', { name: /sonraki kapıyı seç/i })
    expect(
      within(caseDeck)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/tr/cases/the-front-door', '/tr/cases/the-quiet-room', '/tr/cases/the-vault'])
  })
})
