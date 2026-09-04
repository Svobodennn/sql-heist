import { describe, expect, it, vi } from 'vitest'
import { navigateToLocaleDestination } from '@/app/components/LanguageSwitcher/localeNavigation'

describe('locale navigation', () => {
  it('uses a document navigation for rewrite-backed public-profile paths', () => {
    const push = vi.fn()
    const assign = vi.fn()

    navigateToLocaleDestination('/tr/user/ada_l', push, assign)

    expect(assign).toHaveBeenCalledWith('/tr/user/ada_l')
    expect(push).not.toHaveBeenCalled()
  })

  it('keeps regular static routes on the app router', () => {
    const push = vi.fn()
    const assign = vi.fn()

    navigateToLocaleDestination('/pl/help', push, assign)

    expect(push).toHaveBeenCalledWith('/pl/help')
    expect(assign).not.toHaveBeenCalled()
  })
})
