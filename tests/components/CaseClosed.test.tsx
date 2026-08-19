import type { ReactNode } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// CaseClosed renders a next/link "back to the board"; the app-router context isn't
// mounted in jsdom, so stub Link down to a plain anchor.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}))

import { CaseClosed } from '@/features/game/components/CasePlayer/CaseClosed'
import { CASES } from '@/features/game/cases'

afterEach(cleanup)

const gameCase = CASES[0] // the-front-door
const first = gameCase.objectives[0] // auth-bypass — fields: username + password

describe('<CaseClosed> — the move box reflects what the player typed', () => {
  it('composes the debrief SQL from the player’s actual winning payload', () => {
    const pwned = "' OR /*pwned*/ '1'='1' -- "
    const { container } = render(
      <CaseClosed
        gameCase={gameCase}
        solvedInputs={{ [first.id]: { username: pwned, password: '' } }}
        onReplay={() => {}}
      />,
    )
    // SqlPreview weaves the raw input into the composed query; textContent joins the spans.
    expect(container.textContent).toContain(pwned)
  })

  it('falls back to the authored expectedSolution when session inputs are gone', () => {
    const canonical = first.expectedSolution.inputs.username
    expect(canonical).toBeTruthy()
    const { container } = render(<CaseClosed gameCase={gameCase} onReplay={() => {}} />)
    expect(container.textContent).toContain(canonical)
  })
})
