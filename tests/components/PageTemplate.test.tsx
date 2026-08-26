import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PageTemplate from '@/app/template'

afterEach(cleanup)

describe('<PageTemplate>', () => {
  it('keeps route content inside the page-transition boundary', () => {
    render(
      <PageTemplate>
        <main>Case files</main>
      </PageTemplate>,
    )

    const content = screen.getByText('Case files')
    expect(content.parentElement?.className).toBeTruthy()
  })
})
