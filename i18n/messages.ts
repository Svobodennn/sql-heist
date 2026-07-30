import type { Locale } from './config'
import { DEFAULT_LOCALE } from './config'
import type { MessageTree } from './translate'
import en from '@/messages/en.json'
import tr from '@/messages/tr.json'
import pl from '@/messages/pl.json'

// Static catalog map. All three are bundled (they are small, flat display text);
// no runtime fetch, which is required under `output: 'export'`. `en` is the
// canonical source of truth for keys — tr/pl are en-cloned stubs for now.
const CATALOGS: Record<Locale, MessageTree> = {
  en: en as MessageTree,
  tr: tr as MessageTree,
  pl: pl as MessageTree,
}

export const EN_MESSAGES = CATALOGS.en

export function getMessages(locale: Locale): MessageTree {
  return CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE]
}
