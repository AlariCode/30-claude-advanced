'use client'

import { Button, Modal, Spinner } from '@heroui/react'
import { useState } from 'react'
import type { Meeting } from '@/lib/types'

const API = process.env.NEXT_PUBLIC_API_URL

interface CreateMeetingModalProps {
  isOpen: boolean
  onCreated: (meeting: Meeting) => void
  onClose: () => void
}

export function CreateMeetingModal({ isOpen, onCreated, onClose }: CreateMeetingModalProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [participantsInput, setParticipantsInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(open: boolean) {
    if (!open) onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const participants = participantsInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)

    try {
      const res = await fetch(`${API}/meetings`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date: new Date(date).toISOString(), participants }),
      })

      if (!res.ok) throw new Error('Ошибка создания встречи')

      const meeting: Meeting = await res.json()
      setTitle('')
      setDate('')
      setParticipantsInput('')
      onCreated(meeting)
    } catch {
      setError('Не удалось создать встречу')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Новая встреча</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <form
                id="create-meeting-form"
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Название <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Планёрка команды"
                    required
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                    style={{
                      background: 'color-mix(in oklch, var(--foreground) 5%, transparent)',
                      border: '1px solid color-mix(in oklch, var(--foreground) 12%, transparent)',
                      color: 'var(--foreground)',
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Дата и время <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                    style={{
                      background: 'color-mix(in oklch, var(--foreground) 5%, transparent)',
                      border: '1px solid color-mix(in oklch, var(--foreground) 12%, transparent)',
                      color: 'var(--foreground)',
                      colorScheme: 'light dark',
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Участники
                  </label>
                  <input
                    type="text"
                    value={participantsInput}
                    onChange={(e) => setParticipantsInput(e.target.value)}
                    placeholder="alice@example.com, bob@example.com"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-colors"
                    style={{
                      background: 'color-mix(in oklch, var(--foreground) 5%, transparent)',
                      border: '1px solid color-mix(in oklch, var(--foreground) 12%, transparent)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    Через запятую
                  </p>
                </div>

                {error && (
                  <p className="text-sm" style={{ color: 'var(--danger)' }}>
                    {error}
                  </p>
                )}
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="outline" size="sm" type="button">
                Отмена
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="create-meeting-form"
                isDisabled={isSubmitting}
              >
                {isSubmitting ? <Spinner size="sm" /> : 'Создать'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  )
}
