import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BriefingGate } from '@/features/game/components/BriefingGate'

afterEach(cleanup)

const briefing = { handler: 'The Fixer', text: 'We go in the front — get inside, map it, take the score.' }

describe('<BriefingGate>', () => {
  it('shows the brief text + handler and fires onStart from the CTA', () => {
    const onStart = vi.fn()
    render(<BriefingGate briefing={briefing} objectiveCount={3} onStart={onStart} />)
    expect(screen.getByText(briefing.text)).toBeTruthy()
    expect(screen.getByText(briefing.handler)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Take the case' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('pluralizes the objective count', () => {
    const many = render(<BriefingGate briefing={briefing} objectiveCount={3} onStart={() => {}} />)
    expect(many.container.textContent).toContain('objectives')
    many.unmount()

    const solo = render(<BriefingGate briefing={briefing} objectiveCount={1} onStart={() => {}} />)
    expect(solo.container.textContent).toMatch(/\b1 objective\b/)
    expect(solo.container.textContent).not.toContain('objectives')
  })
})
