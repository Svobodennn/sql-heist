import type { ReactNode } from 'react'

// Heist-arc frame (Server Component). Kept width-agnostic: the Job Board manages
// its own container, and <JobPlayer> renders a full-bleed sticky shell.
export default function JobsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
