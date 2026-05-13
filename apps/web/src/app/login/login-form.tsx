'use client'

import { Button, Card, FieldError, Form, Input, Label, Spinner, TextField } from '@heroui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { saveToken } from '@/lib/auth'

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 mt-0.5"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const message = data?.message
        setServerError(
          Array.isArray(message) ? message.join('. ') : (message ?? 'Неверный email или пароль'),
        )
        return
      }

      const data = await res.json()
      saveToken(data.token)
      router.push('/')
    } catch {
      setServerError('Не удалось подключиться к серверу. Попробуйте ещё раз.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--background)' }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Video Meetings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Видеовстречи без границ
          </p>
        </div>

        <Card className="shadow-lg">
          <Card.Header className="pt-4">
            <Card.Title>Войти в аккаунт</Card.Title>
            <Card.Description>Введите ваш email и пароль</Card.Description>
          </Card.Header>

          <Form onSubmit={handleSubmit}>
            <Card.Content className="flex flex-col gap-4">
              <TextField
                isRequired
                fullWidth
                name="email"
                type="email"
                autoComplete="email"
                validate={(value) => {
                  if (!value) return null
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Введите корректный email'
                  return null
                }}
              >
                <Label>Email</Label>
                <Input placeholder="you@example.com" variant="secondary" />
                <FieldError />
              </TextField>

              <TextField
                isRequired
                fullWidth
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
              >
                <Label>Пароль</Label>
                <div className="relative">
                  <Input placeholder="••••••••" variant="secondary" className="pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ color: 'var(--muted)' }}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                <FieldError />
              </TextField>

              {serverError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: 'color-mix(in oklch, var(--danger) 12%, transparent)',
                    color: 'var(--danger)',
                  }}
                >
                  <WarningIcon />
                  <span>{serverError}</span>
                </div>
              )}
            </Card.Content>

            <Card.Footer className="flex flex-col gap-3 mt-2">
              <Button type="submit" fullWidth isDisabled={isLoading} isPending={isLoading}>
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    {isPending ? 'Вход...' : 'Войти'}
                  </>
                )}
              </Button>

              <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
                Нет аккаунта?{' '}
                <Link
                  href="/register"
                  className="font-medium underline underline-offset-4"
                  style={{ color: 'var(--accent)' }}
                >
                  Зарегистрироваться
                </Link>
              </p>
            </Card.Footer>
          </Form>
        </Card>
      </div>
    </div>
  )
}
