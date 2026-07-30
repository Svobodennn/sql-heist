type LogoProps = {
  size?: number
  className?: string
  /** Set to expose the mark to assistive tech with this label; otherwise it is decorative. */
  title?: string
}

// The Skeleton — SQL Heist's mark. The injection apostrophe (') reforged as the
// bow of a skeleton key: quote-head, shaft, two teeth. `currentColor` lets it
// inherit the surrounding ink (brass in the nav/footer wordmark).
export function Logo({ size = 24, className, title }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="currentColor"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d="M32 7C39.2 7 45 12.8 45 20C45 28.6 38.4 32.9 32 40.5C25.6 32.9 19 28.6 19 20C19 12.8 24.8 7 32 7Z" />
      <rect x="28.4" y="34" width="7.2" height="23" rx="3.6" />
      <rect x="35.4" y="45.5" width="8.2" height="4.6" rx="1.6" />
      <rect x="35.4" y="52.6" width="5.6" height="4.6" rx="1.6" />
    </svg>
  )
}
