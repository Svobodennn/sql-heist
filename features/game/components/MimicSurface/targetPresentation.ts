import type { SurfaceKind } from '@/lib/schema/level'

export type TargetTheme = 'holdings' | 'recovery' | 'vault'

export interface TargetPresentation {
  theme: TargetTheme
  host: string
  monogram: string
  division: string
}

const TARGETS: Readonly<Record<string, TargetPresentation>> = {
  'the-front-door': {
    theme: 'holdings',
    host: 'portal.meridian-holdings.com',
    monogram: 'MH',
    division: 'Corporate Services',
  },
  'the-quiet-room': {
    theme: 'recovery',
    host: 'recovery.meridian-security.com',
    monogram: 'MR',
    division: 'Recovery & Security',
  },
  'the-vault': {
    theme: 'vault',
    host: 'access.meridian-vault.com',
    monogram: 'MV',
    division: 'Vault Operations',
  },
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'target'
  )
}

export function targetPresentation(caseId: string, appName: string): TargetPresentation {
  return (
    TARGETS[caseId] ?? {
      theme: 'holdings',
      host: `${slugify(appName)}.example`,
      monogram: appName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join(''),
      division: appName,
    }
  )
}

function surfacePath(surface: SurfaceKind): string {
  if (surface === 'login-form') return '/staff/login'
  if (surface === 'search-box') return '/records/search'
  if (surface === 'profile-lookup') return '/badges/profile'
  return '/requests/verify?token='
}

export function targetUrl(caseId: string, appName: string, surface: SurfaceKind): string {
  const target = targetPresentation(caseId, appName)
  return `https://${target.host}${surfacePath(surface)}`
}
