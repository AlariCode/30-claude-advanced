export interface Meeting {
  id: string
  title: string
  date: string
  participants: string[]
  ownerId: string
}

export interface MeetingFile {
  id: string
  meetingId: string
  originalName: string
  mimeType: string
  size: number
  uploadedAt: string
  transcriptionStatus: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED' | 'SKIPPED'
  transcript: string | null
  transcriptionError: string | null
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface ActionItem {
  task: string
  assignee: string | null
}

export type SummaryStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED'

export interface MeetingSummary {
  id: string
  meetingId: string
  summary: string | null
  actionItems: ActionItem[] | null
  decisions: string[] | null
  status: SummaryStatus
  error: string | null
  createdAt: string
  updatedAt: string
}
