import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { getCaseMetas } from '@/features/game/cases'
import { CaseCard } from '@/features/game/components/CaseCard'

afterEach(cleanup)

describe('<CaseCard> cinematic artwork', () => {
  it('uses its stable case id for a decorative production image and reveal hook', () => {
    const meta = getCaseMetas().find((item) => item.id === 'the-quiet-room')!
    const view = render(<CaseCard meta={meta} done={0} />)
    const card = view.container.querySelector('li')
    const image = view.container.querySelector('img')

    expect(card?.getAttribute('data-case-id')).toBe('the-quiet-room')
    expect(card?.hasAttribute('data-reveal')).toBe(true)
    expect(image?.getAttribute('src')).toBe('/cinematic-breach/case-quiet-room.webp')
    expect(image?.getAttribute('alt')).toBe('')
  })
})
