import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HomeBody } from '@/app/HomeBody'

afterEach(cleanup)

const caseArtworkSizes =
  '(max-width: 520px) calc(100vw - 74px), (max-width: 800px) calc(90vw - 42px), (max-width: 1600px) calc(30vw - 42px), calc((100vw - 286px) / 3)'

const caseArtworkNames = ['case-front-door', 'case-quiet-room', 'case-vault'] as const

describe('<HomeBody> Cinematic Breach production composition', () => {
  it('renders the approved operation, case deck, live SQL proof, and pre-flight FAQ', () => {
    const view = render(<HomeBody locale="en" />)

    expect(view.container.querySelector('[data-home-design="cinematic-breach"]')).not.toBeNull()
    expect(screen.getByText('LIVE FIRE: USERS.SEARCH')).toBeTruthy()
    expect(screen.getByText('EXECUTED SQL')).toBeTruthy()
    expect(screen.getByText('3 ROWS')).toBeTruthy()
    expect(screen.queryByText('VIEW SECURE VERSION')).toBeNull()
    expect(screen.getByTestId('data-flow-schematic')).toBeTruthy()

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

  it('serves responsive case artwork while keeping every fallback lazy', () => {
    const view = render(<HomeBody locale="en" />)
    const pictures = Array.from(view.container.querySelectorAll('picture'))

    expect(pictures).toHaveLength(caseArtworkNames.length)

    pictures.forEach((picture, index) => {
      const artworkName = caseArtworkNames[index]
      const avif = picture.querySelector('source[type="image/avif"]')
      const webp = picture.querySelector('source[type="image/webp"]')
      const fallback = picture.querySelector('img')

      expect(avif?.getAttribute('srcset')).toBe(
        `/cinematic-breach/${artworkName}-640.avif 640w, /cinematic-breach/${artworkName}-1280.avif 1280w`,
      )
      expect(webp?.getAttribute('srcset')).toBe(
        `/cinematic-breach/${artworkName}-640.webp 640w, /cinematic-breach/${artworkName}-1280.webp 1280w`,
      )
      expect(avif?.getAttribute('sizes')).toBe(caseArtworkSizes)
      expect(webp?.getAttribute('sizes')).toBe(caseArtworkSizes)
      expect(fallback?.getAttribute('src')).toBe(
        `/cinematic-breach/${artworkName}-1280.webp`,
      )
      expect(fallback?.getAttribute('loading')).toBe('lazy')
    })
  })
})
