'use client'

import { Card, Spinner } from '@heroui/react'
import { Button } from '@heroui/react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { CalendarIcon, UsersIcon } from '@/components/icons'
import { formatDateTime } from '@/lib/format'
import type { Meeting, MeetingFile } from '@/lib/types'
import { clearToken, getEmailFromToken, getToken, getUserIdFromToken } from '@/lib/auth'
import { FileRow } from './file-row'
import { FileUploadZone } from './file-upload-zone'

const API = process.env.NEXT_PUBLIC_API_URL

export function MeetingPage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.id as string

  const [token, setToken] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [files, setFiles] = useState<MeetingFile[]>([])
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true)
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [meetingError, setMeetingError] = useState<string | null>(null)
  const [filesError, setFilesError] = useState<string | null>(null)

  const loadFiles = useCallback(
    async (authToken: string) => {
      setIsLoadingFiles(true)
      setFilesError(null)
      try {
        const res = await fetch(`${API}/meetings/${meetingId}/files`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok) throw new Error('Ошибка загрузки файлов')
        setFiles(await res.json())
      } catch {
        setFilesError('Не удалось загрузить файлы')
      } finally {
        setIsLoadingFiles(false)
      }
    },
    [meetingId],
  )

  useEffect(() => {
    const t = getToken()
    if (!t) {
      router.replace('/login')
      return
    }
    setToken(t)
    setEmail(getEmailFromToken(t))
    setCurrentUserId(getUserIdFromToken(t))

    const controller = new AbortController()

    fetch(`${API}/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${t}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (res.status === 401) {
          clearToken()
          router.replace('/login')
          return
        }
        if (res.status === 404) {
          setMeetingError('Встреча не найдена')
          return
        }
        if (!res.ok) throw new Error()
        setMeeting(await res.json())
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setMeetingError('Не удалось загрузить встречу')
      })
      .finally(() => setIsLoadingMeeting(false))

    loadFiles(t)
    return () => controller.abort()
  }, [meetingId, router, loadFiles])

  function handleLogout() {
    clearToken()
    router.push('/login')
  }

  function handleFileDeleted(fileId: string) {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  function handleFileUploaded(file: MeetingFile) {
    setFiles((prev) => [file, ...prev])
  }

  const isOwner = !!currentUserId && !!meeting && meeting.ownerId === currentUserId

  if (isLoadingMeeting) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--background)' }}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (meetingError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--background)' }}
      >
        <div className="text-center flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {meetingError}
          </p>
          <Link href="/" className="text-sm" style={{ color: 'var(--accent)' }}>
            ← Назад к встречам
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{
                background: 'color-mix(in oklch, var(--foreground) 8%, transparent)',
                color: 'var(--foreground)',
              }}
              aria-label="Назад"
            >
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
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <div>
              <h1
                className="text-lg font-bold leading-tight"
                style={{ color: 'var(--foreground)' }}
              >
                {meeting?.title}
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

        {meeting && (
          <Card className="shadow-sm">
            <Card.Header>
              <Card.Title className="text-base">Информация о встрече</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                <CalendarIcon />
                <span>{formatDateTime(meeting.date)}</span>
              </div>
              {meeting.participants.length > 0 && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                  <UsersIcon />
                  <span>{meeting.participants.join(', ')}</span>
                </div>
              )}
            </Card.Content>
          </Card>
        )}

        <Card className="shadow-sm">
          <Card.Header>
            <Card.Title className="text-base">Файлы</Card.Title>
            <Card.Description>
              {isLoadingFiles
                ? 'Загрузка...'
                : files.length === 0
                  ? 'Нет загруженных файлов'
                  : `${files.length} ${files.length === 1 ? 'файл' : files.length < 5 ? 'файла' : 'файлов'}`}
            </Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4">
            {isOwner && token && (
              <FileUploadZone meetingId={meetingId} token={token} onUploaded={handleFileUploaded} />
            )}

            {isLoadingFiles ? (
              <div className="flex justify-center py-6">
                <Spinner size="md" />
              </div>
            ) : filesError ? (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {filesError}
              </p>
            ) : files.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
                {isOwner ? 'Загрузите первый файл' : 'Файлы ещё не загружены'}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {files.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    meetingId={meetingId}
                    isOwner={isOwner}
                    token={token!}
                    onDelete={handleFileDeleted}
                  />
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  )
}
