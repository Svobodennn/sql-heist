'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import type { InputField, SurfaceKind } from '@/lib/schema/level'
import { cx } from '../lib/cx'
import { Button } from './Button'
import styles from './MimicSurface.module.css'

// THE FRONT (docs/04-frontend-ux.md §5.3): the mimic app the victim sees. Fields
// look like an ordinary login/search but are monospace + auto-growing so long
// payloads (UNION SELECT …, sqlite_master) fit. `interactive` toggles between
// passive recon (read-only) and the live exploit surface.

// SSR has no layout; fall back to useEffect on the server render pass.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function mimicUrl(appName: string, surface: SurfaceKind): string {
  const slug =
    appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'target'
  const path =
    surface === 'login-form'
      ? '/login'
      : surface === 'search-box'
        ? '/search'
        : surface === 'profile-lookup'
          ? '/profile'
          : '/?q='
  return `${slug}.internal${path}`
}

function AutoGrowField({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: InputField
  value: string
  onChange?: (v: string) => void
  readOnly: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      id={`field-${field.name}`}
      className={cx('mono', styles.input)}
      value={value}
      placeholder={field.placeholder}
      readOnly={readOnly}
      rows={1}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      aria-label={field.label}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}

interface MimicSurfaceProps {
  surface: SurfaceKind
  appName: string
  fields: InputField[]
  values: Record<string, string>
  onChange?: (field: string, value: string) => void
  onSubmit?: () => void
  interactive: boolean
  className?: string
}

export function MimicSurface({
  surface,
  appName,
  fields,
  values,
  onChange,
  onSubmit,
  interactive,
  className,
}: MimicSurfaceProps) {
  const submitLabel =
    surface === 'login-form' ? 'Sign in' : surface === 'search-box' ? 'Search' : 'Submit'

  return (
    <form
      className={cx(styles.surface, className)}
      onSubmit={(e) => {
        e.preventDefault()
        if (interactive) onSubmit?.()
      }}
    >
      <p className={styles.appName}>{appName}</p>

      <div className={styles.fields}>
        {fields.map((field) => (
          <div key={field.name} className={styles.fieldBlock}>
            <label htmlFor={`field-${field.name}`} className={styles.label}>
              {field.label}
            </label>
            {field.type === 'password' ? (
              <input
                id={`field-${field.name}`}
                type="password"
                className={cx('mono', styles.input, styles.inputSingle)}
                value={values[field.name] ?? ''}
                placeholder={field.placeholder}
                readOnly={!interactive}
                spellCheck={false}
                aria-label={field.label}
                onChange={(e) => onChange?.(field.name, e.target.value)}
              />
            ) : (
              <AutoGrowField
                field={field}
                value={values[field.name] ?? ''}
                onChange={(v) => onChange?.(field.name, v)}
                readOnly={!interactive}
              />
            )}
          </div>
        ))}
      </div>

      <Button type="submit" variant="primary" full disabled={!interactive}>
        {submitLabel}
      </Button>

      {!interactive && (
        <p className={styles.reconNote}>
          This form talks to a query behind the counter. What happens if your input isn&apos;t
          treated as just a name?
        </p>
      )}
    </form>
  )
}
