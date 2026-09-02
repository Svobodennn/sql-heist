import type { Locale } from '@/i18n/config'
import { HeroImagePreload } from './components/HeroImagePreload'
import { CinematicHomeBody } from './CinematicHomeBody'

// Stable landing entry shared by `/`, `/tr`, and `/pl`. The cinematic composition
// stays isolated from route and locale plumbing so those public contracts do not
// change when the visual system evolves.
export function HomeBody({ locale }: { locale: Locale }) {
  return (
    <>
      <HeroImagePreload />
      <CinematicHomeBody locale={locale} />
    </>
  )
}
