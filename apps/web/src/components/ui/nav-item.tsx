import type { ReactNode, AnchorHTMLAttributes } from 'react'

interface NavItemProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  label: string
  icon: ReactNode
  active?: boolean
}

export function NavItem({ label, icon, active = false, className = '', ...props }: NavItemProps) {
  return (
    <a
      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-[10px] text-[14px] font-medium transition-colors ${
        active
          ? 'bg-accent-soft text-accent'
          : 'bg-transparent text-text-secondary hover:bg-surface-subtle'
      } ${className}`}
      {...props}
    >
      <span className="flex shrink-0">{icon}</span>
      <span>{label}</span>
    </a>
  )
}
