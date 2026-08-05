import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CaseBadgeStrip } from '@/features/game/components/CaseBadgeStrip'
import { getCaseMetas } from '@/features/game/cases'

afterEach(cleanup)

describe('<CaseBadgeStrip>', () => {
  it('renders every technique slot locked when there is no saved progress', () => {
    render(<CaseBadgeStrip cases={getCaseMetas()} records={{}} />)

    const badges = screen.getAllByRole('listitem')
    expect(badges.length).toBeGreaterThan(0)
    for (const b of badges) expect(b.getAttribute('aria-label')).toMatch(/locked$/)

    // Summary landmark: nothing mastered, no cases closed.
    expect(
      screen.getByLabelText(/Technique mastery: 0 of \d+\. 0 of \d+ cases closed\./),
    ).toBeTruthy()
  })
})
