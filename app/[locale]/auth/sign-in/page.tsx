import type { Metadata } from 'next'
import { SignInForm } from '@/features/auth'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { pageAlternates } from '@/app/localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  return {
    title: t('auth.signIn.title'),
    alternates: pageAlternates('/auth/sign-in', activeLocale),
    robots: { index: false, follow: true },
  }
}

export default function LocaleSignInPage() {
  return <SignInForm />
}
