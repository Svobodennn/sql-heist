import type { Metadata } from 'next'
import { SignUpForm } from '@/features/auth'
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
    title: t('auth.signUp.title'),
    alternates: pageAlternates('/auth/sign-up', activeLocale),
  }
}

export default function LocaleSignUpPage() {
  return <SignUpForm />
}
