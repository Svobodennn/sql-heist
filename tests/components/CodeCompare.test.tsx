import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CodeCompare } from '@/features/game/components/CodeCompare'
import type { LanguageGroup } from '@/features/game/lib/secureCode'

afterEach(cleanup)

const vulnerableGroups: LanguageGroup[] = [
  {
    language: 'js',
    name: 'JavaScript',
    options: [
      {
        label: 'Node.js',
        shortLabel: 'Node.js',
        snippet: {
          language: 'js',
          code: '// unsafe input\nconst rows = await client.query("raw SQL")',
        },
      },
      {
        label: 'Prisma',
        shortLabel: 'Prisma',
        snippet: {
          language: 'js',
          code: '// unsafe Prisma\nconst rows = prisma.$queryRawUnsafe("raw SQL")',
        },
      },
    ],
  },
  {
    language: 'python',
    name: 'Python',
    options: [
      {
        label: 'Django',
        shortLabel: 'Django',
        snippet: {
          language: 'python',
          code: '# unsafe input\ndef lookup(value):\n    return cursor.execute(f"{value}")',
        },
      },
    ],
  },
]

const secureGroups: LanguageGroup[] = [
  {
    language: 'js',
    name: 'JavaScript',
    options: [
      {
        label: 'Node.js',
        shortLabel: 'Node.js',
        snippet: {
          language: 'js',
          code: '// bound input\nconst rows = await client.query("safe SQL", [value])',
        },
      },
      {
        label: 'Prisma',
        shortLabel: 'Prisma',
        snippet: {
          language: 'js',
          code: '// safe Prisma\nconst rows = prisma.$queryRaw("safe SQL")',
        },
      },
    ],
  },
  {
    language: 'python',
    name: 'Python',
    options: [
      {
        label: 'Django',
        shortLabel: 'Django',
        snippet: {
          language: 'python',
          code: '# bound input\ndef lookup(value):\n    return User.objects.filter(value=value)',
        },
      },
    ],
  },
]

describe('<CodeCompare>', () => {
  it('syntax-highlights both panels with the selected language grammar', () => {
    const view = render(
      <CodeCompare vulnerableGroups={vulnerableGroups} secureGroups={secureGroups} />,
    )

    expect(view.container.querySelectorAll('code[data-code-language="js"]')).toHaveLength(2)
    expect(view.container.querySelectorAll('[data-code-token="keyword"]')).not.toHaveLength(0)
    expect(view.container.querySelectorAll('[data-code-token="comment"]')).toHaveLength(2)
    expect(view.container.querySelectorAll('[data-code-token="string"]')).not.toHaveLength(0)

    fireEvent.click(view.getByRole('tab', { name: 'Python' }))

    expect(view.container.querySelectorAll('code[data-code-language="python"]')).toHaveLength(2)
    expect(view.container.textContent).toContain('def lookup')
    expect(view.container.querySelectorAll('[data-code-token="keyword"]')).not.toHaveLength(0)
    expect(view.container.querySelectorAll('[data-code-token="comment"]')).toHaveLength(2)
  })

  it('updates both highlighted panels when a framework changes', () => {
    const view = render(
      <CodeCompare vulnerableGroups={vulnerableGroups} secureGroups={secureGroups} />,
    )

    fireEvent.click(view.getByRole('tab', { name: 'Prisma' }))

    expect(view.container.textContent).toContain('$queryRawUnsafe')
    expect(view.container.textContent).toContain('$queryRaw("safe SQL")')
    expect(view.container.querySelectorAll('code[data-code-language="js"]')).toHaveLength(2)
  })
})
