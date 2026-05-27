'use client'

import { AlertDialog, Button, Spinner } from '@heroui/react'
import { useState } from 'react'
import { DownloadIcon, TrashIcon } from '@/components/icons'
import { MimeIcon } from '@/components/mime-icon'
import { formatDateTime, formatSize } from '@/lib/format'
import type { MeetingFile } from '@/lib/types'

const API = process.env.NEXT_PUBLIC_API_URL

interface FileRowProps {
  file: MeetingFile
  meetingId: string
  isOwner: boolean
  token: string
  onDelete: (id: string) => void
}

export function FileRow({ file, meetingId, isOwner, token, onDelete }: FileRowProps) {
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
            {formatSize(file.size)} · {formatDateTime(file.uploadedAt)}
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
