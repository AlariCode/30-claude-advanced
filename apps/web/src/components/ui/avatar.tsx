type AvatarVariant = 'accent' | 'success' | 'violet'

interface AvatarProps {
  initials: string
  variant?: AvatarVariant
  size?: number
}

const variantClasses: Record<AvatarVariant, string> = {
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  violet: 'bg-violet-soft text-violet',
}

export function Avatar({ initials, variant = 'accent', size = 36 }: AvatarProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-[family-name:var(--font-head)] font-semibold ${variantClasses[variant]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.39) }}
    >
      {initials.slice(0, 2)}
    </div>
  )
}
