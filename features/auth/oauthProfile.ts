import type { User } from '@supabase/supabase-js'

export const OAUTH_PROVIDERS = ['google', 'github'] as const

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

function metadataString(metadata: User['user_metadata'], key: string): string {
  const value = metadata?.[key]
  return typeof value === 'string' ? value : ''
}

export function getIdentityProviders(user: User): string[] {
  const providers = new Set<string>()
  const appProviders = user.app_metadata?.providers

  if (Array.isArray(appProviders)) {
    for (const provider of appProviders) {
      if (typeof provider === 'string') providers.add(provider)
    }
  }

  const primaryProvider = user.app_metadata?.provider
  if (typeof primaryProvider === 'string') providers.add(primaryProvider)

  for (const identity of user.identities ?? []) {
    if (typeof identity.provider === 'string') providers.add(identity.provider)
  }

  return [...providers]
}

export function getOAuthProviders(user: User): OAuthProvider[] {
  const providers = new Set(getIdentityProviders(user))
  return OAUTH_PROVIDERS.filter((provider) => providers.has(provider))
}

export function hasEmailIdentity(user: User): boolean {
  return getIdentityProviders(user).includes('email')
}

// Email signup is the only flow where the user already chose this exact value.
// Provider usernames are suggestions and must never be claimed automatically.
export function getEmailSignupUsername(user: User): string {
  const providers = getIdentityProviders(user)
  const oauthOnly = providers.length > 0 && !providers.includes('email')
  return oauthOnly ? '' : metadataString(user.user_metadata, 'username')
}

function normalizeSuggestion(value: string): string {
  const candidate = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20)
    .replace(/_+$/g, '')

  return candidate.length >= 3 ? candidate : ''
}

export function suggestOAuthUsername(user: User): string {
  if (getOAuthProviders(user).length === 0) return ''

  const metadata = user.user_metadata
  const candidates = [
    metadataString(metadata, 'user_name'),
    metadataString(metadata, 'preferred_username'),
    metadataString(metadata, 'nickname'),
    metadataString(metadata, 'full_name'),
    metadataString(metadata, 'name'),
  ]

  for (const candidate of candidates) {
    const normalized = normalizeSuggestion(candidate)
    if (normalized) return normalized
  }

  return ''
}
