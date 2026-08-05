import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObjectivesProgress } from '@/features/game/components/ObjectivesProgress'
import { CASES } from '@/features/game/cases'

afterEach(cleanup)

// Real objectives (3) keep the test honest without hand-building full Objective literals.
const objectives = CASES[0].objectives

describe('<ObjectivesProgress>', () => {
  it('renders every objective with its goal', () => {
    render(
      <ObjectivesProgress
        objectives={objectives}
        completed={new Set()}
        selectedIndex={0}
        onSelect={() => {}}
      />,
    )
    for (const o of objectives) expect(screen.getByText(o.goal)).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(objectives.length)
  })

  it('makes done + active selectable but locks later objectives', () => {
    const onSelect = vi.fn()
    const completed = new Set([objectives[0].id]) // clears obj 0 → obj 1 becomes active
    render(
      <ObjectivesProgress
        objectives={objectives}
        completed={completed}
        selectedIndex={0}
        onSelect={onSelect}
      />,
    )
    // Done (0) + active (1) render as buttons; the later one (2) is locked (no button).
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    fireEvent.click(buttons[1])
    expect(onSelect).toHaveBeenCalledWith(1)
    expect(screen.getByText('locked — clear the earlier objectives first')).toBeTruthy()
  })
})
