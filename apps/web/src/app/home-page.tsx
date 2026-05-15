'use client'

import { Button, Card, Spinner } from '@heroui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { clearToken, getEmailFromToken, getToken } from '@/lib/auth'

interface Meeting {
  id: string
  title: string
  date: string
  participants: string[]
}

function CalendarIcon() {
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MeetingCard({ meeting, highlight }: { meeting: Meeting; highlight?: boolean }) {
  return (
    <Link href={`/meetings/${meeting.id}`} className="block no-underline">
      <div
        className="rounded-xl px-4 py-3 flex flex-col gap-1 transition-colors cursor-pointer"
        style={{
          background: highlight
            ? 'color-mix(in oklch, var(--accent) 10%, transparent)'
            : 'color-mix(in oklch, var(--foreground) 5%, transparent)',
          border: highlight
            ? '1px solid color-mix(in oklch, var(--accent) 30%, transparent)'
            : '1px solid transparent',
        }}
      >
        <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
          {meeting.title}
        </p>
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
          <CalendarIcon />
          <span>{formatDate(meeting.date)}</span>
        </div>
        {meeting.participants.length > 0 && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
            <UsersIcon />
            <span>{meeting.participants.join(', ')}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export function HomePage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
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

    fetch('http://localhost:3001/meetings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          clearToken()
          router.replace('/login')
          return
        }
        if (!res.ok) throw new Error('Ошибка загрузки встреч')
        const data = await res.json()
        setMeetings(data)
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
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
            <div>
              <h1
                className="text-lg font-bold leading-tight"
                style={{ color: 'var(--foreground)' }}
              >
                Video Meetings
              </h1>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {email}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onPress={handleLogout}>
            Выйти
          </Button>
        </div>

        {/* Recent meetings */}
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

        {/* All meetings */}
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
