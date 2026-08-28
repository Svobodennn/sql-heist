import type { Metadata } from 'next'
import { CallbackPanel } from '@/features/auth'

// Registered in the Supabase redirect allow-list (prod + localhost). Robots stay
// out — the page is meaningless without a one-time code.
export const metadata: Metadata = { title: 'Confirming', robots: { index: false } }

export default function AuthCallbackPage() {
  return <CallbackPanel />
}
