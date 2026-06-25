import type { InputHTMLAttributes } from 'react'

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  placeholder?: string
}

export function SearchField({
  placeholder = 'Поиск…',
  className = '',
  ...props
}: SearchFieldProps) {
  return (
    <div
      className={`flex w-full items-center gap-[10px] rounded-[10px] border border-border bg-surface-subtle px-[14px] py-[10px] ${className}`}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-text-muted"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
        {...props}
      />
    </div>
  )
}
