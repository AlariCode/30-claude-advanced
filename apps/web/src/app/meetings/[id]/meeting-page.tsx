'use client'

import { AlertDialog, Button, Card, Spinner } from '@heroui/react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { clearToken, getEmailFromToken, getToken, getUserIdFromToken } from '@/lib/auth'

interface Meeting {
  id: string
  title: string
  date: string
  participants: string[]
  ownerId: string
}

interface MeetingFile {
  id: string
  meetingId: string
  originalName: string
  mimeType: string
  size: number
  uploadedAt: string
}

const API = process.env.NEXT_PUBLIC_API_URL

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

function MimeIcon({ mimeType }: { mimeType: string }) {
  const color = 'var(--muted)'

  if (mimeType.startsWith('video/'))
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M10 9l6 3-6 3V9z" fill={color} stroke="none" />
      </svg>
    )

  if (mimeType.startsWith('audio/'))
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    )

  if (mimeType === 'application/pdf')
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    )

  if (mimeType.includes('spreadsheetml') || mimeType.includes('excel'))
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
        <line x1="8" y1="9" x2="10" y2="9" />
      </svg>
    )

  if (mimeType.includes('presentationml') || mimeType.includes('powerpoint'))
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    )

  // default: generic document (covers text/plain, docx, unknown)
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  )
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

function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function TrashIcon() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

function FileRow({
  file,
  meetingId,
  isOwner,
  token,
  onDelete,
}: {
  file: MeetingFile
  meetingId: string
  isOwner: boolean
  token: string
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDownload() {
    setDownloadError(null)
    try {
      const res = await fetch(`${API}/meetings/${meetingId}/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.originalName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setDownloadError('Не удалось скачать файл')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`${API}/meetings/${meetingId}/files/${file.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok || res.status === 204) {
        onDelete(file.id)
      } else {
        throw new Error()
      }
    } catch {
      setDeleteError('Не удалось удалить файл')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{
          background: 'color-mix(in oklch, var(--foreground) 4%, transparent)',
          border: '1px solid color-mix(in oklch, var(--foreground) 8%, transparent)',
        }}
      >
        <span className="shrink-0 flex items-center justify-center w-8 h-8">
          <MimeIcon mimeType={file.mimeType} />
        </span>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <p
            className="text-sm font-medium truncate"
            style={{ color: 'var(--foreground)' }}
            title={file.originalName}
          >
            {file.originalName}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {formatSize(file.size)} · {formatDate(file.uploadedAt)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onPress={handleDownload}
            aria-label={`Скачать ${file.originalName}`}
          >
            <DownloadIcon />
          </Button>
          {isOwner && (
            <AlertDialog>
              <Button
                size="sm"
                variant="ghost"
                isDisabled={deleting}
                aria-label={`Удалить ${file.originalName}`}
                style={{ color: 'var(--danger)' }}
              >
                {deleting ? <Spinner size="sm" /> : <TrashIcon />}
              </Button>
              <AlertDialog.Backdrop>
                <AlertDialog.Container>
                  <AlertDialog.Dialog className="sm:max-w-[400px]">
                    <AlertDialog.CloseTrigger />
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="danger" />
                      <AlertDialog.Heading>Удалить файл?</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <p>
                        Файл <strong>{file.originalName}</strong> будет удалён без возможности
                        восстановления.
                      </p>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button slot="close" variant="tertiary">
                        Отмена
                      </Button>
                      <Button slot="close" variant="danger" onPress={handleDelete}>
                        Удалить
                      </Button>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          )}
        </div>
      </div>
      {downloadError && (
        <p className="text-xs px-4" style={{ color: 'var(--danger)' }}>
          {downloadError}
        </p>
      )}
      {deleteError && (
        <p className="text-xs px-4" style={{ color: 'var(--danger)' }}>
          {deleteError}
        </p>
      )}
    </div>
  )
}

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
        {/* Header */}
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

        {/* Meeting info */}
        {meeting && (
          <Card className="shadow-sm">
            <Card.Header>
              <Card.Title className="text-base">Информация о встрече</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                <CalendarIcon />
                <span>{formatDate(meeting.date)}</span>
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

        {/* Files section */}
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
          <Card.Content>
            {isLoadingFiles ? (
              <div className="flex justify-center py-6">
                <Spinner size="md" />
              </div>
            ) : filesError ? (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                {filesError}
              </p>
            ) : files.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>
                Файлы ещё не загружены
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
