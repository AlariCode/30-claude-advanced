import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonPrimaryProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon?: ReactNode
}

interface ButtonSecondaryProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon?: ReactNode
}

export function ButtonPrimary({ label, icon, className = '', ...props }: ButtonPrimaryProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-[10px] bg-accent px-[18px] py-[11px] text-[14px] font-semibold text-text-inverse shadow-[0_4px_12px_color-mix(in_srgb,var(--color-accent)_20%,transparent)] transition-colors hover:bg-accent-press active:bg-accent-press ${className}`}
      {...props}
    >
      {icon && <span className="flex shrink-0">{icon}</span>}
      {label}
    </button>
  )
}

export function ButtonSecondary({ label, icon, className = '', ...props }: ButtonSecondaryProps) {
  return (
    <button
      className={`inline-flex items-center gap-[6px] rounded-[9px] border border-border bg-surface px-[12px] py-[8px] text-[13px] font-semibold text-text-secondary transition-colors hover:bg-surface-subtle ${className}`}
      {...props}
    >
      {label}
      {icon && <span className="flex shrink-0">{icon}</span>}
    </button>
  )
}
