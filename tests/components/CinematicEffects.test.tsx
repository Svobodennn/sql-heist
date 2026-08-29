import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CinematicCursor } from '@/app/components/CinematicCursor'
import { installScrollReveal } from '@/app/components/ScrollReveal/ScrollReveal'

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('cursor-enhanced', 'motion-ready')
})

function media(matches: boolean) {
  return {
    matches,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } satisfies MediaQueryList
}

describe('<CinematicCursor>', () => {
  it('mounts in eligible environments and restores document state on cleanup', () => {
    const pointer = media(true)
    const reduced = media(false)
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      query.includes('prefers-reduced-motion') ? reduced : pointer,
    )
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(7)
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)

    const view = render(<CinematicCursor />)

    expect(document.documentElement.classList.contains('cursor-enhanced')).toBe(true)
    expect(view.container.querySelector('[aria-hidden="true"]')).not.toBeNull()

    view.unmount()

    expect(document.documentElement.classList.contains('cursor-enhanced')).toBe(false)
    expect(cancel).toHaveBeenCalledWith(7)
    expect(pointer.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(reduced.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('marks text controls so the native text cursor can take over', () => {
    const pointer = media(true)
    const reduced = media(false)
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      query.includes('prefers-reduced-motion') ? reduced : pointer,
    )
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(8)

    const view = render(
      <>
        <CinematicCursor />
        <input aria-label="SQL input" />
      </>,
    )

    fireEvent.pointerMove(view.getByLabelText('SQL input'), { clientX: 20, clientY: 30 })

    expect(view.container.querySelector('[aria-hidden="true"]')?.className).toContain('isText')
  })
})

describe('installScrollReveal', () => {
  it('reveals intersecting and keyboard-focused content, then disconnects cleanly', () => {
    document.body.innerHTML = `
      <main id="root">
        <section data-reveal="left"><button>Open case</button></section>
        <section data-reveal="right">Second</section>
      </main>
    `
    const observe = vi.fn()
    const unobserve = vi.fn()
    const disconnect = vi.fn()
    let callback: IntersectionObserverCallback = () => undefined
    class FakeObserver {
      constructor(next: IntersectionObserverCallback) {
        callback = next
      }
      observe = observe
      unobserve = unobserve
      disconnect = disconnect
    }

    const root = document.querySelector<HTMLElement>('#root')!
    const cleanupReveal = installScrollReveal(root, {
      reducedMotion: false,
      Observer: FakeObserver as unknown as typeof IntersectionObserver,
    })
    const targets = root.querySelectorAll<HTMLElement>('[data-reveal]')

    expect(document.documentElement.classList.contains('motion-ready')).toBe(true)
    expect(observe).toHaveBeenCalledTimes(2)

    callback([{ isIntersecting: true, target: targets[1] } as unknown as IntersectionObserverEntry], {} as IntersectionObserver)
    expect(targets[1].getAttribute('data-reveal-visible')).toBe('true')

    fireEvent.focusIn(root.querySelector('button')!)
    expect(targets[0].getAttribute('data-reveal-visible')).toBe('true')

    cleanupReveal()
    expect(disconnect).toHaveBeenCalledOnce()
    expect(document.documentElement.classList.contains('motion-ready')).toBe(false)
  })

  it('leaves content visible when reduced motion is requested', () => {
    document.body.innerHTML = '<main id="root"><section data-reveal>Always visible</section></main>'
    const root = document.querySelector<HTMLElement>('#root')!

    const cleanupReveal = installScrollReveal(root, { reducedMotion: true })

    expect(document.documentElement.classList.contains('motion-ready')).toBe(false)
    expect(root.querySelector('[data-reveal]')?.hasAttribute('data-reveal-visible')).toBe(false)
    cleanupReveal()
  })
})
