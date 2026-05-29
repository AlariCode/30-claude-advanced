'use client'

const SESSION_KEY = 'vm_session'

export function markLoggedIn(): void {
  sessionStorage.setItem(SESSION_KEY, '1')
}

export function markLoggedOut(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export async function callLogout(apiUrl: string): Promise<void> {
  markLoggedOut()
  await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => null)
}
