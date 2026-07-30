import { DEFAULT_LOCALE, type Locale } from './config'
import { EN_MESSAGES, getMessages } from './messages'
import { createTranslator, type Translator } from './translate'

// Translator for Server Components. Under `output: 'export'` there is no request
// runtime and no per-locale routing, so server-rendered pages (home, help, legal)
// are statically generated in the DEFAULT locale at build time. This keeps them
// translation-READY (all strings live in the catalog) while the runtime language
// switch drives the Client Components (nav, footer, game shell).
//
// `locale` defaults to DEFAULT_LOCALE; a future per-locale export can pass another.
export function getServerTranslator(locale: Locale = DEFAULT_LOCALE): Translator {
  return createTranslator(getMessages(locale), EN_MESSAGES)
}
