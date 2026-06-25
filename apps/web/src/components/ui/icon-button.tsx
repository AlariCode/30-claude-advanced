import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  size?: number
}

export function IconButton({ icon, label, size = 42, className = '', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-[10px] border border-border bg-surface-subtle text-text-secondary transition-colors hover:bg-ground ${className}`}
      style={{ width: size, height: size }}
      {...props}
    >
      <span className="flex">{icon}</span>
    </button>
  )
}
