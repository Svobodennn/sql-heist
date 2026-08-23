'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import styles from './DeleteAccountDialog.module.css'

export type DeleteAccountError = 'reauth' | 'request' | null

interface DeleteAccountDialogProps {
  username: string
  deleting: boolean
  error: DeleteAccountError
  onClose(): void
  onConfirm(password: string): void | Promise<void>
  onEdit(): void
}

export function DeleteAccountDialog({
  username,
  deleting,
  error,
  onClose,
  onConfirm,
  onEdit,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation()
  const [confirmation, setConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const confirmationRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    confirmationRef.current?.focus()
  }, [])

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (deleting || confirmation !== username || password.length === 0) return
    void onConfirm(password)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={`panel ${styles.modal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-body"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <h2 id="delete-modal-title" className={styles.title}>
          {t('account.deleteModalTitle')}
        </h2>
        <p id="delete-modal-body" className={styles.copy}>
          {t('account.deleteModalBody')}
        </p>
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="delete-confirmation">
              {t('account.deleteConfirmLabel', { username })}
            </label>
            <input
              ref={confirmationRef}
              id="delete-confirmation"
              className={`mono ${styles.input}`}
              value={confirmation}
              autoComplete="off"
              spellCheck={false}
              required
              disabled={deleting}
              onChange={(event) => {
                setConfirmation(event.target.value)
                onEdit()
              }}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="delete-password">
              {t('account.deletePasswordLabel')}
            </label>
            <input
              id="delete-password"
              className={styles.input}
              type="password"
              value={password}
              autoComplete="current-password"
              required
              disabled={deleting}
              aria-invalid={error === 'reauth' ? true : undefined}
              aria-describedby={error === 'reauth' ? 'delete-dialog-error' : undefined}
              onChange={(event) => {
                setPassword(event.target.value)
                onEdit()
              }}
            />
          </div>
          {error && (
            <p id="delete-dialog-error" className={styles.error} role="alert">
              {t(error === 'reauth' ? 'account.errors.reauth' : 'account.errors.delete')}
            </p>
          )}
          <div className={styles.actions}>
            <button className="btn btn--ghost" type="button" disabled={deleting} onClick={onClose}>
              {t('account.cancel')}
            </button>
            <button
              className="btn btn--danger"
              type="submit"
              disabled={deleting || confirmation !== username || password.length === 0}
            >
              {deleting ? t('account.deleting') : t('account.deleteConfirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
