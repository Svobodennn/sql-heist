import { describe, expect, it } from 'vitest'
import { createTranslator, lookup, type MessageTree } from './translate'
import en from '@/messages/en.json'
import tr from '@/messages/tr.json'
import pl from '@/messages/pl.json'

// Synthetic catalogs so these tests pin the ENGINE behavior, independent of the
// real (currently en-cloned) tr/pl values.
const EN: MessageTree = {
  greeting: 'Hello, {name}',
  nav: { home: 'Home' },
}
const TR: MessageTree = {
  greeting: 'Merhaba, {name}',
  // nav.home intentionally absent → must fall back to en.
}

describe('lookup', () => {
  it('resolves a dot path to its string', () => {
    expect(lookup(EN, 'nav.home')).toBe('Home')
  })

  it('interpolates {vars}', () => {
    expect(lookup(EN, 'greeting', { name: 'Ada' })).toBe('Hello, Ada')
  })

  it('returns undefined for a missing path or a subtree node', () => {
    expect(lookup(EN, 'nav.missing')).toBeUndefined()
    expect(lookup(EN, 'nav')).toBeUndefined()
  })
})

describe('createTranslator — locale switch changes a string', () => {
  it('the same key renders differently per active catalog', () => {
    const tEn = createTranslator(EN, EN)
    const tTr = createTranslator(TR, EN)
    expect(tEn('greeting', { name: 'Ada' })).toBe('Hello, Ada')
    expect(tTr('greeting', { name: 'Ada' })).toBe('Merhaba, Ada')
    expect(tTr('greeting')).not.toBe(tEn('greeting'))
  })
})

describe('createTranslator — fallback to en', () => {
  it('a key missing in the active locale falls back to en', () => {
    const tTr = createTranslator(TR, EN)
    expect(tTr('nav.home')).toBe('Home')
  })

  it('an unknown key returns the key itself, never blank', () => {
    const tEn = createTranslator(EN, EN)
    expect(tEn('does.not.exist')).toBe('does.not.exist')
  })
})

describe('real catalogs', () => {
  const tEn = createTranslator(en as MessageTree, en as MessageTree)
  const tTr = createTranslator(tr as MessageTree, en as MessageTree)
  const tPl = createTranslator(pl as MessageTree, en as MessageTree)

  it('en resolves the pinned board heading (guards the E2E-asserted value)', () => {
    expect(tEn('game.board.title')).toBe('Three jobs. One score.')
  })

  it('tr/pl are en-cloned stubs for now (identical rendered values)', () => {
    expect(tTr('nav.home')).toBe('Home')
    expect(tPl('nav.home')).toBe('Home')
    expect(tTr('game.board.title')).toBe('Three jobs. One score.')
    expect(tPl('game.exploit.sendIt')).toBe('Send it')
  })
})
