'use client'

import { useState, type InputHTMLAttributes } from 'react'
import { EyeIcon } from '@/components/icons'

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  required?: boolean
  hint?: string
  type?: 'text' | 'email' | 'password'
  errorMessage?: string
}

export function AuthField({
  label,
  required = false,
  hint,
  type = 'text',
  errorMessage,
  className = '',
  ...props
}: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <label className="text-[15px] font-semibold text-text-primary">{label}</label>
        {required && (
          <span className="text-[15px] font-semibold" style={{ color: '#E5484D' }}>
            *
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-[10px] rounded-[12px] bg-ground px-[16px] py-[15px]">
        <input
          type={inputType}
          className="w-full bg-transparent text-[16px] text-text-primary outline-none placeholder:text-text-muted"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="shrink-0 text-text-muted"
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <EyeIcon open={showPassword} />
          </button>
        )}
      </div>
      {hint && !errorMessage && <p className="text-[13px] text-text-muted">{hint}</p>}
      {errorMessage && (
        <p className="text-[13px]" style={{ color: '#E5484D' }}>
          {errorMessage}
        </p>
      )}
    </div>
  )
}
