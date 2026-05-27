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
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}
