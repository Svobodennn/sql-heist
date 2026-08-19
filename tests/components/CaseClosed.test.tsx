import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
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

// The payload is rendered verbatim inside a <code> chip; the SqlPreview splits the same
// value into per-char spans (and the default normalizer trims whitespace), so match on the
// chip by tag + substring (a multi-field move prefixes each value with its field label).
// SqlPreview uses <pre>/<span>, never <code>, so <code> is uniquely our typed chip.
const chip = (value: string) => (_: string, el: Element | null) =>
  el?.tagName === 'CODE' && (el.textContent ?? '').includes(value)

describe('<CaseClosed> — the move shows what the player typed', () => {
  it('renders the player’s actual winning payload, not the canonical solution', () => {
    const pwned = "' OR /*pwned*/ '1'='1' -- "
    render(
      <CaseClosed
        gameCase={gameCase}
        solvedInputs={{ [first.id]: { username: pwned, password: '' } }}
        onReplay={() => {}}
      />,
    )
    expect(screen.getAllByText('What you typed').length).toBeGreaterThan(0)
    expect(screen.getAllByText(chip(pwned)).length).toBeGreaterThan(0)
  })

  it('falls back to the authored expectedSolution when the session inputs are gone', () => {
    const canonical = first.expectedSolution.inputs.username
    expect(canonical).toBeTruthy()
    render(<CaseClosed gameCase={gameCase} onReplay={() => {}} />)
    expect(screen.getAllByText(chip(canonical)).length).toBeGreaterThan(0)
  })
})
