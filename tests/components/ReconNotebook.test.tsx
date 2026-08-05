import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReconNotebook } from '@/features/game/components/ReconNotebook'
import {
  initNotebook,
  recordPull,
  type ReconNotebook as Notebook,
} from '@/features/game/lib/reconNotebook'
import { EN_MESSAGES } from '@/i18n/messages'
import { createTranslator } from '@/i18n/translate'

// Component tests run under jsdom (vitest.config environmentMatchGlobs). The i18n
// context defaults to English, so a bare render still gets real strings — no
// provider wrapper needed. We assert chrome text through the SAME translator the
// component reads, so tests track copy changes instead of hardcoding them.
const t = createTranslator(EN_MESSAGES, EN_MESSAGES)
const base = (): Notebook => initNotebook([{ table: 'articles', columns: ['id', 'title'] }])

afterEach(cleanup)

describe('<ReconNotebook>', () => {
  it('shows the empty note when nothing has been pulled or pried loose', () => {
    render(<ReconNotebook notebook={base()} />)
    expect(screen.getByText(t('game.notebook.empty'))).toBeTruthy()
    expect(screen.getByLabelText(t('game.notebook.factsAria', { n: 0 }))).toBeTruthy()
  })

  it('lists pulled facts (label + detail) and drops the empty note', () => {
    const nb = recordPull(base(), 'ADMIN ACCESS', 'target row surfaced')
    render(<ReconNotebook notebook={nb} />)
    expect(screen.getByText('ADMIN ACCESS')).toBeTruthy()
    expect(screen.getByText('target row surfaced')).toBeTruthy()
    expect(screen.queryByText(t('game.notebook.empty'))).toBeNull()
    expect(screen.getByLabelText(t('game.notebook.factsAria', { n: 1 }))).toBeTruthy()
  })

  it('renders a pried-loose table with its columns and counts table + columns', () => {
    const nb: Notebook = {
      advertised: ['articles'],
      discovered: [{ table: 'offshore_accounts', columns: ['id', 'holder_name'] }],
      pulled: [],
    }
    render(<ReconNotebook notebook={nb} />)
    expect(screen.getByText('offshore_accounts')).toBeTruthy()
    expect(screen.getByText('holder_name')).toBeTruthy()
    // 1 table + 2 columns + 0 pulled = 3 facts.
    expect(screen.getByLabelText(t('game.notebook.factsAria', { n: 3 }))).toBeTruthy()
  })
})
