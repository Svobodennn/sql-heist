import type { ReactNode } from 'react'
import { PageTemplate } from '@/app/shell/PageTemplate'

export default function LocaleTemplate({ children }: { children: ReactNode }) {
  return <PageTemplate>{children}</PageTemplate>
}
