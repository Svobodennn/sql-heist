import type { Metadata } from 'next'
import { getCaseMetas } from '@/features/game/cases'
import { CaseBoard } from '@/features/game/components/CaseBoard'

export const metadata: Metadata = {
  title: 'Cases',
  description:
    'The SQL Heist case board — three themed breaches of one target system, eight hands-on SQL-injection objectives from authentication bypass to blind, error-based, stacked, and WAF-bypass. Pick a case and pull it off.',
  alternates: { canonical: '/cases' },
}

// Case board (Server Component, static). Loads validated case metadata — no SQL,
// no engine — and hands it to the client <CaseBoard>, which derives each case's
// progress from localStorage.
export default function CaseBoardPage() {
  return (
    <div className="container">
      <CaseBoard cases={getCaseMetas()} />
    </div>
  )
}
