'use client'

import { Card, Spinner, Button } from '@heroui/react'
import { useCallback, useEffect, useState } from 'react'
import type { MeetingSummary } from '@/lib/types'

const API = process.env.NEXT_PUBLIC_API_URL

interface MeetingSummarySectionProps {
  meetingId: string
  isOwner: boolean
  hasDoneTranscription: boolean
}

export function MeetingSummarySection({
  meetingId,
  isOwner,
  hasDoneTranscription,
}: MeetingSummarySectionProps) {
  const [summary, setSummary] = useState<MeetingSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API}/meetings/${meetingId}/summary`, { credentials: 'include' })
      if (res.status === 404) {
        setSummary(null)
        return
      }
      if (!res.ok) throw new Error('Ошибка загрузки выжимки')
      const data: MeetingSummary = await res.json()
      setSummary(data)
    } catch {
      setError('Не удалось загрузить выжимку')
    } finally {
      setIsLoading(false)
    }
  }, [meetingId])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    const isActive = summary?.status === 'PENDING' || summary?.status === 'IN_PROGRESS'
    if (!isActive) return
    const intervalId = setInterval(loadSummary, 3000)
    return () => clearInterval(intervalId)
  }, [summary?.status, loadSummary])

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch(`${API}/meetings/${meetingId}/summary`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Ошибка генерации выжимки')
      await loadSummary()
    } catch {
      setError('Не удалось запустить генерацию выжимки')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateButtonLabel =
    summary === null || summary.status === 'FAILED' ? 'Сгенерировать выжимку' : 'Перегенерировать'

  return (
    <Card className="shadow-sm">
      <Card.Header>
        <div className="flex items-center justify-between w-full">
          <Card.Title className="text-base">Выжимка встречи</Card.Title>
          {isOwner && (
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                variant="outline"
                isDisabled={!hasDoneTranscription || isGenerating}
                onPress={handleGenerate}
              >
                {isGenerating ? <Spinner size="sm" /> : generateButtonLabel}
              </Button>
              {!hasDoneTranscription && (
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  Сначала дождитесь завершения транскрипции
                </span>
              )}
            </div>
          )}
        </div>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        ) : summary === null ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>
            Выжимка ещё не сгенерирована
          </p>
        ) : summary.status === 'PENDING' || summary.status === 'IN_PROGRESS' ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <Spinner size="md" />
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              Генерация выжимки...
            </span>
          </div>
        ) : summary.status === 'FAILED' ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {summary.error ?? 'Ошибка генерации выжимки'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {summary.summary && (
              <Card className="shadow-none border">
                <Card.Header>
                  <Card.Title className="text-sm">Краткое содержание</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--foreground)' }}>
                    {summary.summary}
                  </p>
                </Card.Content>
              </Card>
            )}

            {summary.actionItems && summary.actionItems.length > 0 && (
              <Card className="shadow-none border">
                <Card.Header>
                  <Card.Title className="text-sm">Задачи</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="flex flex-col gap-1">
                    {summary.actionItems.map((item, index) => (
                      <div key={index} className="text-sm" style={{ color: 'var(--foreground)' }}>
                        • {item.task}
                        {item.assignee ? (
                          <span style={{ color: 'var(--muted)' }}> → {item.assignee}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            )}

            {summary.decisions && summary.decisions.length > 0 && (
              <Card className="shadow-none border">
                <Card.Header>
                  <Card.Title className="text-sm">Принятые решения</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="flex flex-col gap-1">
                    {summary.decisions.map((decision, index) => (
                      <div key={index} className="text-sm" style={{ color: 'var(--foreground)' }}>
                        • {decision}
                      </div>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            )}
          </div>
        )}
      </Card.Content>
    </Card>
  )
}
