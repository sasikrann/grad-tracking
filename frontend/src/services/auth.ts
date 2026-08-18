import { ref } from 'vue'

import type { CurrentUser, UserRole } from '@/types/user'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const validRoles: UserRole[] = ['admin', 'advisor', 'student']

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

function storeSession(user: CurrentUser) {
  currentUser.value = user
}

export const currentUser = ref<CurrentUser | null>(null)

let hasInitialized = false
let initializationPromise: Promise<void> | null = null

function clearSession() {
  currentUser.value = null
  hasInitialized = true
}

export async function logout() {
  try {
    await fetch(`${apiUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } finally {
    clearSession()
  }
}

export function initializeAuth() {
  if (hasInitialized) return Promise.resolve()
  if (initializationPromise) return initializationPromise

  initializationPromise = (async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include',
      })

      if (!response.ok) {
        clearSession()
        return
      }

      const result = (await response.json()) as { data?: unknown }

      if (!isCurrentUser(result.data)) {
        clearSession()
        return
      }

      currentUser.value = result.data
      hasInitialized = true
    } catch {
      clearSession()
    }
  })().finally(() => {
    initializationPromise = null
  })

  return initializationPromise
}

export async function loginWithGoogleCredential(credential: string) {
  const response = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  const result = (await response.json()) as {
    data?: { user?: unknown }
    message?: string
  }

  if (!response.ok || !isCurrentUser(result.data?.user)) {
    throw new Error(result.message || 'Unable to sign in')
  }

  storeSession(result.data.user)
  hasInitialized = true

  return result.data.user
}

/*
 * DEVELOPMENT LOGIN BYPASS
 * The backend accepts this request only when explicitly enabled on localhost.
 */
export async function loginForDevelopment(email: string) {
  const response = await fetch(`${apiUrl}/api/auth/dev-login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const result = (await response.json()) as {
    data?: { user?: unknown }
    message?: string
  }

  if (!response.ok || !isCurrentUser(result.data?.user)) {
    throw new Error(result.message || 'Unable to sign in for development')
  }

  storeSession(result.data.user)
  hasInitialized = true

  return result.data.user
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  await initializeAuth()

  const response = await fetch(input, { ...init, credentials: 'include' })

  if (response.status === 401) {
    clearSession()
  }

  return response
}
