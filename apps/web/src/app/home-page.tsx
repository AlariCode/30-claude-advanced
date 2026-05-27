'use client'

import { Button, Card, Spinner } from '@heroui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MeetingCard } from '@/components/meeting-card'
import { clearToken, getEmailFromToken, getToken } from '@/lib/auth'
import type { Meeting, UserProfile } from '@/lib/types'

export function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/login')
      return
    }

    setEmail(getEmailFromToken(token))

    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/meetings`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, { headers }),
    ])
      .then(async ([meetingsRes, profileRes]) => {
        if (meetingsRes.status === 401 || profileRes.status === 401) {
          clearToken()
          router.replace('/login')
          return
        }
        if (!meetingsRes.ok) throw new Error('Ошибка загрузки встреч')
        const [meetingsData, profileData] = await Promise.all([
          meetingsRes.json(),
          profileRes.ok ? profileRes.json() : Promise.resolve(null),
        ])
        setMeetings(meetingsData)
        setProfile(profileData)
      })
      .catch(() => setFetchError('Не удалось загрузить встречи'))
      .finally(() => setIsLoading(false))
  }, [router])

  function handleLogout() {
    clearToken()
    router.push('/login')
  }

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

  const recentMeetings = [...meetings]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
              style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              <svg
                width="20"
                height="20"
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
            <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
              Video Meetings
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              aria-label={`Профиль: ${profile?.name ?? email}`}
              className="flex items-center gap-2 no-underline rounded-xl px-3 py-2 min-h-[44px] transition-colors hover:bg-[color-mix(in_oklch,var(--foreground)_6%,transparent)]"
              style={{ color: 'var(--foreground)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{
                  background: profile?.avatarUrl
                    ? 'transparent'
                    : 'color-mix(in oklch, var(--accent) 15%, transparent)',
                  color: 'var(--accent)',
                  border: '1.5px solid color-mix(in oklch, var(--accent) 25%, transparent)',
                }}
              >
                {profile?.avatarUrl ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}${profile.avatarUrl}`}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover"
                  />
                ) : (
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
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                )}
              </div>
              <span className="text-xs max-w-[120px] truncate" style={{ color: 'var(--muted)' }}>
                {profile?.name ?? email}
              </span>
            </Link>
            <Button variant="outline" size="sm" onPress={handleLogout}>
              Выйти
            </Button>
          </div>
        </div>

        {recentMeetings.length > 0 && (
          <Card className="shadow-sm">
            <Card.Header>
              <Card.Title className="text-base">Последние встречи</Card.Title>
              <Card.Description>3 самые свежие из ваших встреч</Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-col gap-2">
              {recentMeetings.map((m) => (
                <MeetingCard key={m.id} meeting={m} highlight />
              ))}
            </Card.Content>
          </Card>
        )}

        <Card className="shadow-sm">
          <Card.Header>
            <Card.Title className="text-base">Все встречи</Card.Title>
            <Card.Description>
              {meetings.length === 0 ? 'У вас пока нет встреч' : `Всего: ${meetings.length}`}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {fetchError ? (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {fetchError}
              </p>
            ) : meetings.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>
                Встречи не найдены
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {meetings.map((m) => (
                  <MeetingCard key={m.id} meeting={m} />
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  )
}
