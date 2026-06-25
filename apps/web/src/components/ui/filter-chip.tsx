import type { ButtonHTMLAttributes } from 'react'

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
}

export function FilterChip({ label, active = false, className = '', ...props }: FilterChipProps) {
  return (
    <button
      className={`inline-flex items-center rounded-[8px] border px-[12px] py-[7px] text-[13px] font-medium transition-colors ${
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-border bg-transparent text-text-secondary hover:bg-surface-subtle'
      } ${className}`}
      {...props}
    >
      {label}
    </button>
  )
}
