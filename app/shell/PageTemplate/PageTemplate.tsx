import type { ReactNode } from 'react'
import { ScrollReveal } from '@/app/components/ScrollReveal'
import styles from './PageTemplate.module.css'

interface PageTemplateProps {
  readonly children: ReactNode
}

export function PageTemplate({ children }: PageTemplateProps) {
  return (
    <div className={styles.page} data-page-template>
      {children}
      <ScrollReveal />
    </div>
  )
}
