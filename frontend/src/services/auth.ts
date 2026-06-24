import { ref } from 'vue'

import type { CurrentUser } from '@/types/user'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const storageKey = 'currentUser'

function loadStoredUser(): CurrentUser | null {
  const storedUser = sessionStorage.getItem(storageKey)

  if (!storedUser) return null

  try {
    return JSON.parse(storedUser) as CurrentUser
  } catch {
    sessionStorage.removeItem(storageKey)
    return null
  }
}

export const currentUser = ref<CurrentUser | null>(loadStoredUser())

export async function loginWithGoogleCredential(credential: string) {
  const response = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to sign in')
  }

  currentUser.value = result.data
  sessionStorage.setItem(storageKey, JSON.stringify(result.data))

  return result.data as CurrentUser
}

export function logout() {
  currentUser.value = null
  sessionStorage.removeItem(storageKey)
}
