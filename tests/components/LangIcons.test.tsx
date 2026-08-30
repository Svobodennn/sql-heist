import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LangIcon } from '@/features/game/components/langIcons'

afterEach(cleanup)

describe('<LangIcon>', () => {
  it('uses the official two-snake Python silhouette as a monochrome glyph', () => {
    render(<LangIcon code="python" data-testid="python-glyph" />)

    const glyph = screen.getByTestId('python-glyph')
    const paths = [...glyph.querySelectorAll('path')]

    expect(glyph.getAttribute('viewBox')).toBe('0 0 110.42 110.42')
    expect(glyph.getAttribute('width')).toBe('15')
    expect(glyph.getAttribute('height')).toBe('15')
    expect(paths).toHaveLength(2)
    expect(paths.every((path) => path.getAttribute('fill') === 'currentColor')).toBe(true)
    expect(glyph.querySelector('circle')).toBeNull()
  })
})
