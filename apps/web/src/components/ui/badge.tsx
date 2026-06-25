import type { ReactNode } from 'react'

type BadgeVariant = 'accent' | 'success' | 'violet'

interface BadgeProps {
  label: string
  icon?: ReactNode
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  violet: 'bg-violet-soft text-violet',
}

export function Badge({ label, icon, variant = 'accent' }: BadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-[5px] rounded-full px-[10px] py-[5px] ${variantClasses[variant]}`}
    >
      {icon && <span className="flex shrink-0">{icon}</span>}
      <span className="text-[12px] font-semibold leading-none">{label}</span>
    </div>
  )
}
