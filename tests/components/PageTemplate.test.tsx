import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PageTemplate } from '@/app/shell/PageTemplate'

vi.mock('@/app/components/ScrollReveal', () => ({
  ScrollReveal: () => <span data-scroll-reveal="true" />,
}))

describe('<PageTemplate>', () => {
  it('keeps route content and ScrollReveal inside the remount boundary', () => {
    const markup = renderToStaticMarkup(
      <PageTemplate>
        <article>Case files</article>
      </PageTemplate>,
    )

    expect(markup).toContain('data-page-template="true"')
    expect(markup).toContain('<article>Case files</article><span data-scroll-reveal="true"></span>')
  })
})
