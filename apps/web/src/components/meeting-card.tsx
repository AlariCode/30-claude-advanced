import Link from 'next/link'
import { CalendarIcon, UsersIcon } from '@/components/icons'
import { formatDateTime } from '@/lib/format'
import type { Meeting } from '@/lib/types'

interface MeetingCardProps {
  meeting: Meeting
  highlight?: boolean
}

export function MeetingCard({ meeting, highlight }: MeetingCardProps) {
  return (
    <Link href={`/meetings/${meeting.id}`} className="block no-underline">
      <div
        className="rounded-xl px-4 py-3 flex flex-col gap-1 transition-colors"
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
          <span>{formatDateTime(meeting.date)}</span>
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
