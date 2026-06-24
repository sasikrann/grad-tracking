import { ref } from 'vue'

import type { CurrentUser, UserRole } from '@/types/user'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const tokenStorageKey = 'accessToken'
const userStorageKey = 'currentUser'
const validRoles: UserRole[] = ['admin', 'advisor', 'lecturer', 'student']

function isCurrentUser(value: unknown): value is CurrentUser {
  if (!value || typeof value !== 'object') return false

  const user = value as Record<string, unknown>
  return (
    typeof user.fullName === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string' &&
    validRoles.includes(user.role as UserRole)
  )
}

function loadStoredUser() {
  const storedUser = sessionStorage.getItem(userStorageKey)

  if (!storedUser) return null

  try {
    const user: unknown = JSON.parse(storedUser)
    return isCurrentUser(user) ? user : null
  } catch {
    return null
  }
}

function storeSession(token: string, user: CurrentUser) {
  accessToken.value = token
  currentUser.value = user
  sessionStorage.setItem(tokenStorageKey, token)
  sessionStorage.setItem(userStorageKey, JSON.stringify(user))
}

export const accessToken = ref(sessionStorage.getItem(tokenStorageKey))
export const currentUser = ref<CurrentUser | null>(loadStoredUser())

let hasInitialized = false
let initializationPromise: Promise<void> | null = null

export function logout() {
  accessToken.value = null
  currentUser.value = null
  hasInitialized = true
  sessionStorage.removeItem(tokenStorageKey)
  sessionStorage.removeItem(userStorageKey)
}

export function initializeAuth() {
  if (hasInitialized) return Promise.resolve()
  if (initializationPromise) return initializationPromise

  initializationPromise = (async () => {
    if (!accessToken.value) {
      logout()
      return
    }

    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })

      if (!response.ok) {
        logout()
        return
      }

      const result = (await response.json()) as { data?: unknown }

      if (!isCurrentUser(result.data)) {
        logout()
        return
      }

      currentUser.value = result.data
      sessionStorage.setItem(userStorageKey, JSON.stringify(result.data))
      hasInitialized = true
    } catch {
      logout()
    }
  })().finally(() => {
    initializationPromise = null
  })

  return initializationPromise
}

export async function loginWithGoogleCredential(credential: string) {
  const response = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  const result = (await response.json()) as {
    data?: { token?: unknown; user?: unknown }
    message?: string
  }

  if (!response.ok || typeof result.data?.token !== 'string' || !isCurrentUser(result.data.user)) {
    throw new Error(result.message || 'Unable to sign in')
  }

  storeSession(result.data.token, result.data.user)
  hasInitialized = true

  return result.data.user
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  await initializeAuth()

  const headers = new Headers(init.headers)

  if (accessToken.value) {
    headers.set('Authorization', `Bearer ${accessToken.value}`)
  }

  const response = await fetch(input, { ...init, headers })

  if (response.status === 401) {
    logout()
  }

  return response
}
