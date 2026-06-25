'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Video } from 'lucide-react'
import { AuthField } from '@/components/ui/auth-field'
import { WarningIcon } from '@/components/icons'
import { markLoggedIn } from '@/lib/auth'

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = data?.message
        setServerError(
          Array.isArray(message) ? message.join('. ') : (message ?? 'Неверный email или пароль'),
        )
        return
      }

      markLoggedIn()
      router.push('/')
    } catch {
      setServerError('Не удалось подключиться к серверу. Попробуйте ещё раз.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground p-10">
      <div className="flex w-[520px] flex-col gap-9">
        {/* Brand */}
        <div className="flex flex-col items-center gap-[18px]">
          <div
            className="flex h-[76px] w-[76px] items-center justify-center rounded-[20px] bg-accent"
            style={{ boxShadow: '0 6px 16px #0062FF40' }}
          >
            <Video size={38} color="white" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col items-center gap-[6px]">
            <span
              className="text-[34px] font-bold text-text-primary"
              style={{ fontFamily: 'var(--font-head)' }}
            >
              Video Meetings
            </span>
            <span className="text-[17px] text-text-secondary">Видеовстречи без границ</span>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 rounded-[24px] bg-surface p-10"
          style={{ boxShadow: '0 12px 32px #0E142214' }}
        >
          {/* Heading */}
          <div className="flex flex-col gap-1">
            <h1
              className="text-[22px] font-semibold text-text-primary"
              style={{ fontFamily: 'var(--font-head)' }}
            >
              Войти в аккаунт
            </h1>
            <p className="text-[15px] text-text-secondary">Введите ваш email и пароль</p>
          </div>

          <AuthField
            label="Email"
            required
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
          />

          <AuthField
            label="Пароль"
            required
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {serverError && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
              style={{
                background: 'color-mix(in srgb, #E5484D 12%, transparent)',
                color: '#E5484D',
              }}
            >
              <WarningIcon />
              <span>{serverError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-[10px] bg-accent px-[18px] py-[15px] text-[16px] font-semibold text-text-inverse shadow-[0_4px_12px_#0062FF33] transition-colors hover:bg-accent-press disabled:opacity-60"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>

          <div className="flex items-center justify-center gap-[6px]">
            <span className="text-[14px] text-text-secondary">Нет аккаунта?</span>
            <Link
              href="/register"
              className="text-[14px] font-semibold text-accent hover:underline"
            >
              Зарегистрироваться
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
