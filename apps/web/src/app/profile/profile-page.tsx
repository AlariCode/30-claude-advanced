'use client'

import { Button, Card, Spinner } from '@heroui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { clearToken, getToken } from '@/lib/auth'

interface UserProfile {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

function UserAvatarIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function EditIcon() {
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
    >
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <dl className="flex flex-col gap-1">
      <dt className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
        {label}
      </dt>
      <dd className="text-sm" style={{ color: 'var(--foreground)' }}>
        {value}
      </dd>
    </dl>
  )
}

export function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const token = getToken()
    if (!token) {
      router.replace('/login')
      return
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 401) {
          clearToken()
          router.replace('/login')
          return
        }
        if (!res.ok) throw new Error('Ошибка загрузки профиля')
        const data = await res.json()
        setProfile(data)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setFetchError('Не удалось загрузить профиль')
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [router])

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--background)' }}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (fetchError || !profile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--background)' }}
      >
        <p className="text-sm" style={{ color: 'var(--danger)' }}>
          {fetchError ?? 'Профиль не найден'}
        </p>
      </div>
    )
  }

  const displayName = profile.name ?? profile.email

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <nav aria-label="Навигация">
          <Link
            href="/"
            className="inline-block text-sm no-underline py-2 pr-2"
            style={{ color: 'var(--muted)' }}
          >
            ← Главная
          </Link>
        </nav>

        <main className="flex flex-col gap-6">
          <Card className="shadow-sm">
            <Card.Content className="flex flex-col items-center gap-4 py-8">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  background: profile.avatarUrl
                    ? 'transparent'
                    : 'color-mix(in oklch, var(--accent) 15%, transparent)',
                  color: 'var(--accent)',
                  border: '2px solid color-mix(in oklch, var(--accent) 20%, transparent)',
                }}
              >
                {profile.avatarUrl ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}${profile.avatarUrl}`}
                    alt="Аватар пользователя"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserAvatarIcon />
                )}
              </div>

              <h1 className="text-xl font-bold text-center" style={{ color: 'var(--foreground)' }}>
                {displayName}
              </h1>
            </Card.Content>
          </Card>

          <Card className="shadow-sm">
            <Card.Header>
              <Card.Title className="text-base">Информация</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-4">
              <ProfileField label="Email" value={profile.email} />
              {profile.name && <ProfileField label="Имя" value={profile.name} />}
              <ProfileField label="Дата регистрации" value={formatDate(profile.createdAt)} />
            </Card.Content>
          </Card>

          <Button className="w-full gap-2" onPress={() => router.push('/profile/edit')}>
            <EditIcon />
            Редактировать профиль
          </Button>
        </main>
      </div>
    </div>
  )
}
