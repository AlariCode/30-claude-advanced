'use client'

import { Spinner } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { UploadIcon } from '@/components/icons'
import { formatSize } from '@/lib/format'
import type { MeetingFile } from '@/lib/types'

const API = process.env.NEXT_PUBLIC_API_URL

const ALLOWED_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
])

const MAX_FILE_SIZE = 100 * 1024 * 1024

interface FileUploadZoneProps {
  meetingId: string
  token: string
  onUploaded: (file: MeetingFile) => void
}

export function FileUploadZone({ meetingId, token, onUploaded }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      xhrRef.current?.abort()
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  function validateFile(file: File): string | null {
    if (!ALLOWED_MIMES.has(file.type)) {
      return 'Недопустимый тип файла. Разрешены: PDF, Word, Excel, PowerPoint, видео (MP4, MOV, WebM), аудио (MP3, WAV)'
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Файл слишком большой: ${formatSize(file.size)}. Максимум — 100 МБ`
    }
    return null
  }

  function uploadFile(file: File) {
    const err = validateFile(file)
    if (err) {
      setError(err)
      setSuccess(false)
      return
    }
    setError(null)
    setSuccess(false)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.open('POST', `${API}/meetings/${meetingId}/files`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      setProgress(null)
      if (xhr.status === 201) {
        onUploaded(JSON.parse(xhr.responseText) as MeetingFile)
        setSuccess(true)
        successTimerRef.current = setTimeout(() => setSuccess(false), 2500)
      } else {
        try {
          const body = JSON.parse(xhr.responseText) as { message?: string | string[] }
          const msg = Array.isArray(body.message) ? body.message[0] : body.message
          setError(msg ?? 'Ошибка загрузки файла')
        } catch {
          setError('Ошибка загрузки файла')
        }
      }
    }

    xhr.onerror = () => {
      setProgress(null)
      setError('Ошибка сети при загрузке файла')
    }

    xhr.send(formData)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  const isUploading = progress !== null
  const isActive = isDragging || isHovered

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={isUploading ? -1 : 0}
        aria-label="Перетащите файл или нажмите для выбора"
        aria-disabled={isUploading}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!isUploading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onMouseEnter={() => !isUploading && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="rounded-xl flex flex-col items-center justify-center gap-2 py-8 px-4 transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          border: `2px dashed ${isActive ? 'var(--accent)' : 'color-mix(in oklch, var(--foreground) 20%, transparent)'}`,
          background: isActive
            ? 'color-mix(in oklch, var(--accent) 8%, transparent)'
            : 'color-mix(in oklch, var(--foreground) 2%, transparent)',
          outlineColor: 'var(--accent)',
          color: 'var(--muted)',
          cursor: isUploading ? 'default' : 'pointer',
        }}
      >
        {isUploading ? <Spinner size="md" /> : <UploadIcon />}
        {isUploading ? (
          <span className="text-sm" style={{ color: 'var(--foreground)' }}>
            Загрузка... {progress}%
          </span>
        ) : (
          <>
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Перетащите файл или нажмите для выбора
            </span>
            <span className="text-xs">PDF, Word, Excel, PowerPoint, видео, аудио · до 100 МБ</span>
          </>
        )}
      </div>

      {isUploading && (
        <div
          className="rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Прогресс загрузки файла"
          aria-valuenow={progress ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            height: 4,
            background: 'color-mix(in oklch, var(--foreground) 10%, transparent)',
          }}
        >
          <div
            className="h-full transition-all duration-150 motion-reduce:transition-none"
            style={{ width: `${progress}%`, background: 'var(--accent)' }}
          />
        </div>
      )}

      {success && (
        <p
          className="text-xs px-1 flex items-center gap-1"
          style={{ color: 'var(--success, #16a34a)' }}
          role="status"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Файл успешно загружен
        </p>
      )}

      {error && (
        <p className="text-xs px-1" style={{ color: 'var(--danger)' }} role="alert">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={[...ALLOWED_MIMES].join(',')}
        onChange={handleChange}
        tabIndex={-1}
      />
    </div>
  )
}
