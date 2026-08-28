type LogoProps = {
  size?: number
  className?: string
  /** Set to expose the mark to assistive tech with this label; otherwise it is decorative. */
  title?: string
}

// SQL Heist's modified Cowled mark keeps the anonymous operative silhouette and adds
// three database tiers to the lower cowl. `currentColor` lets the brass shapes inherit
// their surrounding ink while the inner shadow stays noir.
// Based on "cowled" from game-icons.net — CC BY 3.0 (see README credits).
export function Logo({ size = 24, className, title }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M256 24C171 24 76 162 62 274c-8 68 31 113 79 164 16 18 31 36 43 54h33c-14-32-33-59-52-85-31-42-60-81-54-116 10-59 79-119 145-153 66 34 135 94 145 153 6 35-23 74-54 116-19 26-38 53-52 85h33c12-18 27-36 43-54 48-51 87-96 79-164C436 162 341 24 256 24Z"
      />
      <path
        fill="#0b0d10"
        d="M256 151c-60 32-117 83-133 135-10 34 20 74 53 118 22 29 43 60 50 88h60c7-28 28-59 50-88 33-44 63-84 53-118-16-52-73-103-133-135Z"
      />
      <path
        fill="currentColor"
        d="M256 171c-43 23-87 58-108 95 9 79 54 127 108 127s99-48 108-127c-21-37-65-72-108-95Z"
      />
      <path
        fill="#0b0d10"
        d="M171 265c25-9 50-9 75 0-19 40-56 40-75 0Zm95 0c25-9 50-9 75 0-19 40-56 40-75 0Z"
      />
      <path
        fill="currentColor"
        d="M178 398c19 19 46 30 78 30s59-11 78-30c-6 23-36 44-78 44s-72-21-78-44Zm23 47c15 11 33 17 55 17s40-6 55-17c-6 19-26 33-55 33s-49-14-55-33Zm27 35c9 5 18 8 28 8s19-3 28-8c-5 10-15 16-28 16s-23-6-28-16Z"
      />
    </svg>
  )
}
