import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Navbar } from '@/app/components/Navbar'

const navigation = vi.hoisted(() => ({
  pathname: '/',
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}))

beforeEach(() => {
  navigation.pathname = '/'
  navigation.push.mockReset()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0)
    return 1
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

describe('<Navbar> mobile command sheet', () => {
  it('locks background scroll, moves focus inside, and closes on Escape', () => {
    render(<Navbar />)

    const toggle = screen.getByRole('button', { name: 'Open menu' })
    fireEvent.click(toggle)

    const dialog = screen.getByRole('dialog', { name: 'Primary' })
    const close = screen.getByRole('button', { name: 'Close menu' })
    expect(dialog.parentElement?.getAttribute('aria-hidden')).toBe('false')
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(close)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(toggle)
  })

  it('marks the locale-resolved active route without changing destinations', () => {
    navigation.pathname = '/cases'
    render(<Navbar />)

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const cases = screen.getAllByRole('link', { name: /Cases/ }).at(-1)

    expect(cases?.getAttribute('href')).toBe('/cases')
    expect(cases?.getAttribute('aria-current')).toBe('page')
  })
})
