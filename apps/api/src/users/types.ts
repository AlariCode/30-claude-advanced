export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: Date
}

export const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  createdAt: true,
} as const
