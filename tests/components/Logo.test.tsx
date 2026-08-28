import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Logo } from '@/app/components/Logo'

afterEach(cleanup)

describe('<Logo>', () => {
  it('renders the five-part database-cowl mark as decorative by default', () => {
    const { container } = render(<Logo />)
    const mark = container.querySelector('svg')

    expect(mark?.getAttribute('aria-hidden')).toBe('true')
    expect(mark?.getAttribute('role')).toBeNull()
    expect(mark?.querySelectorAll('path')).toHaveLength(5)
    expect(mark?.querySelectorAll('path[fill="currentColor"]')).toHaveLength(3)
  })

  it('exposes an accessible image name only when a title is supplied', () => {
    render(<Logo size={32} title="SQL Heist" />)

    const mark = screen.getByRole('img', { name: 'SQL Heist' })
    expect(mark.getAttribute('width')).toBe('32')
    expect(mark.getAttribute('height')).toBe('32')
    expect(mark.querySelector('title')?.textContent).toBe('SQL Heist')
  })
})
