import type { ReactNode } from 'react'
import { ScrollReveal } from './components/ScrollReveal'
import styles from './template.module.css'

export default function PageTemplate({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      {children}
      <ScrollReveal />
    </div>
  )
}
