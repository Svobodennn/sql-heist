import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObjectiveReviewGate } from '@/features/game/components/ObjectiveReviewGate'
import { CASES } from '@/features/game/cases'

afterEach(cleanup)

describe('<ObjectiveReviewGate>', () => {
  it('shows the exact objective contract before entering the operation', () => {
    const objective = CASES[0].objectives[0]
    const onEnter = vi.fn()

    render(
      <ObjectiveReviewGate
        index={0}
        total={CASES[0].objectives.length}
        objective={objective}
        onEnter={onEnter}
      />,
    )

    expect(screen.getByRole('heading', { name: objective.goal })).toBeTruthy()
    expect(screen.getByText(objective.why)).toBeTruthy()
    expect(screen.getByText(objective.doneWhen)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Enter operation' }))
    expect(onEnter).toHaveBeenCalledOnce()
  })
})
