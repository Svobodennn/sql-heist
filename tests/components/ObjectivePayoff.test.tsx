import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObjectivePayoff } from '@/features/game/components/ObjectivePayoff'
import { CASES } from '@/features/game/cases'

afterEach(cleanup)

const objective = CASES[0].objectives[0] // payoff.got 'ADMIN ACCESS' + a Fixer chain line

describe('<ObjectivePayoff>', () => {
  it('shows the loot headline + Fixer chain line and advances via Next', () => {
    const onNext = vi.fn()
    render(
      <ObjectivePayoff
        index={0}
        total={3}
        objective={objective}
        result={null}
        signal={null}
        handler="The Fixer"
        isLast={false}
        onNext={onNext}
      />,
    )
    expect(screen.getByText(objective.payoff!.got)).toBeTruthy()
    expect(screen.getByText(objective.payoff!.fixer, { exact: false })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(screen.getByText('On to the next hand.')).toBeTruthy()
  })

  it('swaps the closing hint on the last objective', () => {
    render(
      <ObjectivePayoff
        index={2}
        total={3}
        objective={objective}
        result={null}
        signal={null}
        handler="The Fixer"
        isLast
        onNext={() => {}}
      />,
    )
    expect(screen.getByText('Close the case — see how they’d have stopped you.')).toBeTruthy()
  })
})
