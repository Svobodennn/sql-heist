import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/ui/cx'

// Thin wrapper over the global .btn design-system class (globals.css). All states
// (hover/active/disabled) + the 44px touch target live in CSS; this only wires
// variants and optional leading/trailing icons.
type Variant = 'primary' | 'ghost' | 'success' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  full?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

export function Button({
  variant = 'primary',
  full,
  icon,
  iconRight,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      // eslint-disable-next-line react/button-has-type
      type={type}
      className={cx('btn', `btn--${variant}`, full && 'btn--full', className)}
      {...rest}
    >
      {icon}
      {children != null && <span>{children}</span>}
      {iconRight}
    </button>
  )
}
