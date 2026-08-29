import type { ReactNode } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// CaseClosed renders a next/link "back to the board"; the app-router context isn't
// mounted in jsdom, so stub Link down to a plain anchor.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))

import { CaseClosed } from '@/features/game/components/CasePlayer/CaseClosed'
import { createObjectiveReceipt } from '@/features/game/components/CasePlayer/objectiveReceipt'
import { CASES } from '@/features/game/cases'
import { compose } from '@/lib/engine/queryComposer'

afterEach(cleanup)

const gameCase = CASES[0] // the-front-door
const first = gameCase.objectives[0] // auth-bypass — fields: username + password

describe('<CaseClosed> — the move box reflects what the player typed', () => {
  it('composes the debrief SQL from the player’s actual winning payload', () => {
    const pwned = "' OR /*pwned*/ '1'='1' -- "
    const inputs = { username: pwned, password: '' }
    const composed = compose(first.query.template, inputs, first.query.inputFilter)
    const receipt = createObjectiveReceipt(
      inputs,
      composed,
      {
        composedSql: composed.sql,
        columns: ['id', 'username', 'is_admin'],
        rows: [[1, 'admin', 1]],
        rowCount: 1,
        durationMs: 2,
      },
      { kind: 'rows', columns: ['id', 'username', 'is_admin'], rows: [[1, 'admin', 1]] },
    )
    const { container } = render(
      <CaseClosed
        gameCase={gameCase}
        receipts={{ [first.id]: receipt }}
        onReplay={() => {}}
      />,
    )
    // The raw move, exact executed SQL, and observed row stay in the same receipt block.
    expect(container.textContent).toContain(pwned)
    expect(container.textContent).toContain('admin')
    expect(container.textContent).toContain('Observed result')
  })

  it('falls back to the authored expectedSolution when session inputs are gone', () => {
    const canonical = first.expectedSolution.inputs.username
    expect(canonical).toBeTruthy()
    const { container } = render(<CaseClosed gameCase={gameCase} onReplay={() => {}} />)
    expect(container.textContent).toContain(canonical)
    expect(container.textContent).toContain('No runtime result in this revisit')
    expect(container.querySelectorAll('[data-runtime-evidence="present"]')).toHaveLength(0)
  })
})
