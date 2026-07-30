import type { Metadata } from 'next'
import { getJobMetas } from '@/features/game/levels'
import { JobBoard } from '@/features/game/components/JobBoard'

export const metadata: Metadata = {
  title: 'Jobs',
  description:
    'The SQL Heist job board — eight targets from authentication bypass to blind, error-based, stacked, and WAF-bypass SQL injection. Pick a mark and pull it off.',
  alternates: { canonical: '/jobs' },
}

// Job board (Server Component, static). Loads validated level metadata and hands
// it to the client <JobBoard>, which derives completed/active/locked from
// localStorage progress.
export default function JobBoardPage() {
  return (
    <div className="container">
      <JobBoard jobs={getJobMetas()} />
    </div>
  )
}
