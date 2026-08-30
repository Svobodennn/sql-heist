'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import type { InputField, SurfaceKind } from '@/lib/schema/level'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '../Button'
import { targetPresentation, targetUrl } from './targetPresentation'
import styles from './MimicSurface.module.css'

// THE FRONT (docs/04-frontend-ux.md §5.3): the mimic app the victim sees. Fields
// look like an ordinary login/search but are monospace + auto-growing so long
// payloads (UNION SELECT …, sqlite_master) fit. `interactive` toggles between
// passive recon (read-only) and the live exploit surface.

// SSR has no layout; fall back to useEffect on the server render pass.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function mimicUrl(caseId: string, appName: string, surface: SurfaceKind): string {
  return targetUrl(caseId, appName, surface)
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
  caseId: string
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
  caseId,
  surface,
  appName,
  fields,
  values,
  onChange,
  onSubmit,
  interactive,
  className,
}: MimicSurfaceProps) {
  const { t } = useTranslation()
  const target = targetPresentation(caseId, appName)
  const submitLabel =
    surface === 'login-form'
      ? t('game.mimic.signIn')
      : surface === 'search-box'
        ? t('game.mimic.search')
        : t('game.mimic.submit')
  const surfaceLabel =
    surface === 'login-form'
      ? t('game.mimic.staffAccess')
      : surface === 'search-box'
        ? t('game.mimic.recordsSearch')
        : surface === 'profile-lookup'
          ? t('game.mimic.badgeLookup')
          : t('game.mimic.requestVerification')

  return (
    <form
      className={cx(styles.surface, className)}
      data-target={target.theme}
      onSubmit={(e) => {
        e.preventDefault()
        if (interactive) onSubmit?.()
      }}
    >
      <header className={styles.siteHeader}>
        <span className={styles.monogram} aria-hidden="true">
          {target.monogram}
        </span>
        <span className={styles.identity}>
          <strong>{appName}</strong>
          <small>{target.division}</small>
        </span>
        <span className={styles.network}>{t('game.mimic.privateNetwork')}</span>
      </header>

      <nav className={styles.siteNav} aria-hidden="true">
        <span>{t('game.mimic.navOverview')}</span>
        <span>{t('game.mimic.navDirectory')}</span>
        <span>{t('game.mimic.navSupport')}</span>
      </nav>

      <div className={styles.siteBody}>
        <p className={styles.surfaceLabel}>{surfaceLabel}</p>
        <h3 className={styles.appName}>{appName}</h3>

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
                  onChange={(value) => onChange?.(field.name, value)}
                  readOnly={!interactive}
                />
              )}
            </div>
          ))}
        </div>

        <Button type="submit" variant="primary" full disabled={!interactive}>
          {submitLabel}
        </Button>

        {!interactive && <p className={styles.reconNote}>{t('game.mimic.reconNote')}</p>}

        <footer className={styles.siteFooter}>
          <span>{target.host}</span>
          <span>{t('game.mimic.encrypted')}</span>
        </footer>
      </div>
    </form>
  )
}
