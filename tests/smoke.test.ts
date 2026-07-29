import { describe, expect, it } from 'vitest'

// Scaffold smoke test — proves the Vitest harness is wired up and `npm test`
// executes. Real engine (P1) and level-payload (P2) tests replace/augment this.
describe('scaffold', () => {
  it('runs the vitest harness', () => {
    expect(true).toBe(true)
  })
})
