import type { Session } from '@supabase/supabase-js'
import type { OAuthProvider } from './oauthProfile'

const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke'
const REVOCATION_FRAME_TTL_MS = 15_000

export function revokeUnusedProviderCredential(
  provider: OAuthProvider | null,
  session: Session,
): boolean {
  if (provider !== 'google' || typeof document === 'undefined') return false

  const token = session.provider_refresh_token || session.provider_token
  if (!token) return false

  const target = `sql-heist-google-revoke-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const frame = document.createElement('iframe')
  frame.name = target
  frame.title = 'Google authorization cleanup'
  frame.hidden = true

  const form = document.createElement('form')
  form.action = GOOGLE_REVOKE_ENDPOINT
  form.method = 'post'
  form.target = target
  form.hidden = true

  const tokenField = document.createElement('input')
  tokenField.type = 'hidden'
  tokenField.name = 'token'
  tokenField.value = token
  form.append(tokenField)
  document.body.append(frame, form)

  try {
    form.submit()
  } catch {
    form.remove()
    frame.remove()
    return false
  }

  form.remove()
  window.setTimeout(() => frame.remove(), REVOCATION_FRAME_TTL_MS)
  return true
}
