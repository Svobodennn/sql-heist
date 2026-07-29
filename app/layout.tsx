import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'SQL Heist',
  description: 'Learn SQL injection by pulling off three jobs — entirely in your browser.',
}

// Root shell (Server Component). Global theme + <ProgressProvider> land here in P3.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
