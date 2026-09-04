import Link from 'next/link'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CinematicCursor } from '@/app/components/CinematicCursor'
import { installScrollReveal, ScrollReveal } from '@/app/components/ScrollReveal/ScrollReveal'

const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: vi.fn() }))

vi.mock('next/navigation', () => ({ usePathname: pathnameMock }))

afterEach(() => {
  cleanup()
  pathnameMock.mockReset()
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('cursor-enhanced')
  document.body.innerHTML = ''
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
    const cursor = view.container.querySelector<HTMLElement>('[aria-hidden="true"]')!

    fireEvent.pointerMove(cursor, { clientX: 20, clientY: 30 })
    fireEvent.pointerMove(cursor, { clientX: 40, clientY: 50 })

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

  it('measures a magnetic target once until its geometry is invalidated', () => {
    const pointer = media(true)
    const reduced = media(false)
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      query.includes('prefers-reduced-motion') ? reduced : pointer,
    )
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(9)

    const view = render(
      <>
        <CinematicCursor />
        <button type="button" data-magnetic>
          Cases
        </button>
      </>,
    )
    const target = view.getByRole('button', { name: 'Cases' })
    const readBounds = vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 110,
      bottom: 60,
      width: 100,
      height: 40,
      toJSON: () => ({}),
    })

    fireEvent.pointerMove(target, { clientX: 20, clientY: 30 })
    fireEvent.pointerMove(target, { clientX: 30, clientY: 35 })
    fireEvent.pointerMove(target, { clientX: 40, clientY: 40 })

    expect(readBounds).toHaveBeenCalledOnce()

    fireEvent.scroll(window)
    fireEvent.pointerMove(target, { clientX: 45, clientY: 42 })

    expect(readBounds).toHaveBeenCalledTimes(2)
  })

  it('resets the active magnetic target when navigation replaces the route content', () => {
    const pointer = media(true)
    const reduced = media(false)
    vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
      query.includes('prefers-reduced-motion') ? reduced : pointer,
    )
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(10)
    pathnameMock.mockReturnValue('/cases')

    const view = render(
      <>
        <CinematicCursor />
        <Link href="/cases/the-front-door">The Front Door</Link>
      </>,
    )
    const cursor = view.container.querySelector<HTMLElement>('[aria-hidden="true"]')!

    fireEvent.pointerMove(view.getByRole('link', { name: 'The Front Door' }), {
      clientX: 20,
      clientY: 30,
    })

    expect(cursor.className).toContain('visible')
    expect(cursor.className).toContain('magnetic')

    pathnameMock.mockReturnValue('/cases/the-front-door')
    view.rerender(
      <>
        <CinematicCursor />
        <main>Case briefing</main>
      </>,
    )

    expect(cursor.className).not.toContain('visible')
    expect(cursor.className).not.toContain('magnetic')
    expect(document.documentElement.classList.contains('cursor-enhanced')).toBe(true)
  })
})

describe('installScrollReveal', () => {
  it('rebinds reveal targets when the persistent template receives a new route', () => {
    const observed: Element[] = []
    const disconnect = vi.fn()

    class FakeObserver {
      constructor(_callback: IntersectionObserverCallback) {}
      observe = (target: Element) => observed.push(target)
      unobserve = vi.fn()
      disconnect = disconnect
    }

    vi.spyOn(window, 'matchMedia').mockReturnValue(media(false))
    vi.stubGlobal('IntersectionObserver', FakeObserver)
    pathnameMock.mockReturnValue('/cases/the-front-door')

    const view = render(
      <main>
        <section data-reveal>Active objective</section>
        <ScrollReveal />
      </main>,
    )

    expect(observed.some((target) => target.textContent === 'Active objective')).toBe(true)

    pathnameMock.mockReturnValue('/cases')
    view.rerender(
      <main>
        <section data-reveal>Case board</section>
        <ScrollReveal />
      </main>,
    )

    expect(disconnect).toHaveBeenCalledOnce()
    expect(observed.some((target) => target.textContent === 'Case board')).toBe(true)
  })

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

    expect(root.getAttribute('data-motion-ready')).toBe('true')
    expect(document.documentElement.classList.contains('motion-ready')).toBe(false)
    expect(observe).toHaveBeenCalledTimes(2)

    callback(
      [{ isIntersecting: true, target: targets[1] } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
    expect(targets[1].getAttribute('data-reveal-visible')).toBe('true')

    fireEvent.focusIn(root.querySelector('button')!)
    expect(targets[0].getAttribute('data-reveal-visible')).toBe('true')

    cleanupReveal()
    expect(disconnect).toHaveBeenCalledOnce()
    expect(root.hasAttribute('data-motion-ready')).toBe(false)
  })

  it('keeps reveal readiness owned by each route root during overlapping transitions', () => {
    document.body.innerHTML = `
      <main id="route-a"><section data-reveal>Old route</section></main>
      <main id="route-b"><section data-reveal>New route</section></main>
    `
    class FakeObserver {
      constructor(_callback: IntersectionObserverCallback) {}
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }

    const routeA = document.querySelector<HTMLElement>('#route-a')!
    const routeB = document.querySelector<HTMLElement>('#route-b')!
    const cleanupA = installScrollReveal(routeA, {
      reducedMotion: false,
      Observer: FakeObserver as unknown as typeof IntersectionObserver,
    })
    const cleanupB = installScrollReveal(routeB, {
      reducedMotion: false,
      Observer: FakeObserver as unknown as typeof IntersectionObserver,
    })

    expect(routeA.getAttribute('data-motion-ready')).toBe('true')
    expect(routeB.getAttribute('data-motion-ready')).toBe('true')

    cleanupA()

    expect(routeA.hasAttribute('data-motion-ready')).toBe(false)
    expect(routeB.getAttribute('data-motion-ready')).toBe('true')

    cleanupB()
    expect(routeB.hasAttribute('data-motion-ready')).toBe(false)
  })

  it('leaves content visible when reduced motion is requested', () => {
    document.body.innerHTML = '<main id="root"><section data-reveal>Always visible</section></main>'
    const root = document.querySelector<HTMLElement>('#root')!

    const cleanupReveal = installScrollReveal(root, { reducedMotion: true })

    expect(root.hasAttribute('data-motion-ready')).toBe(false)
    expect(document.documentElement.classList.contains('motion-ready')).toBe(false)
    expect(root.querySelector('[data-reveal]')?.hasAttribute('data-reveal-visible')).toBe(false)
    cleanupReveal()
  })
})
