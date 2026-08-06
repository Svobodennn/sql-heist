import { describe, expect, it } from 'vitest'
import { CASES } from '@/features/game/cases'
import { applyCaseNarrative, type CaseNarrative } from '@/features/game/lib/caseNarrative'

const base = CASES[0] // the-front-door

describe('applyCaseNarrative', () => {
  it('returns the base reference untouched when there is no overlay', () => {
    expect(applyCaseNarrative(base, undefined)).toBe(base)
  })

  it('replaces narrative, keeps mechanics + code verbatim, and never mutates the base', () => {
    const obj0 = base.objectives[0]
    const overlay: CaseNarrative = {
      title: 'ÇEVİRİ Başlık',
      briefing: 'brifing çevirisi',
      caseClosed: { headline: 'GİRDİK.', fixer: 'kapanış' },
      objectives: {
        [obj0.id]: {
          goal: 'hedef çevirisi',
          hints: { [obj0.hints[0].id]: 'ipucu çevirisi' },
          payoff: { got: 'GANİMET' },
          debrief: { explanation: 'açıklama çevirisi' },
        },
      },
    }
    const out = applyCaseNarrative(base, overlay)

    // narrative replaced where the overlay provides it
    expect(out.title).toBe('ÇEVİRİ Başlık')
    expect(out.briefing.text).toBe('brifing çevirisi')
    expect(out.caseClosed.headline).toBe('GİRDİK.')
    expect(out.objectives[0].goal).toBe('hedef çevirisi')
    expect(out.objectives[0].hints[0].text).toBe('ipucu çevirisi')
    expect(out.objectives[0].payoff?.got).toBe('GANİMET')
    expect(out.objectives[0].debrief.explanation).toBe('açıklama çevirisi')

    // mechanics + code copied verbatim from the base (never localized)
    expect(out.database.schemaSql).toBe(base.database.schemaSql)
    expect(out.objectives[0].query.template).toBe(obj0.query.template)
    expect(out.objectives[0].winCondition).toEqual(obj0.winCondition)
    expect(out.objectives[0].expectedSolution).toEqual(obj0.expectedSolution)
    expect(out.objectives[0].debrief.vulnerableCode).toEqual(obj0.debrief.vulnerableCode)

    // fields the overlay omits fall back to the base (English)
    expect(out.objectives[0].why).toBe(obj0.why)
    expect(out.objectives[0].payoff?.fixer).toBe(obj0.payoff?.fixer)

    // the base object is not mutated
    expect(base.title).not.toBe('ÇEVİRİ Başlık')
  })
})
