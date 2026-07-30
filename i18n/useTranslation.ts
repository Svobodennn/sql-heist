'use client'

import { useContext } from 'react'
import { I18nContext, type I18nContextValue } from './I18nProvider'

// Client hook for display strings. Returns the active `t()` plus the current
// locale + setter (for the language switcher). Re-renders consumers when the
// locale changes.
export function useTranslation(): I18nContextValue {
  return useContext(I18nContext)
}
