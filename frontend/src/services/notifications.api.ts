import { authenticatedFetch } from '@/services/auth'
import type { Notification, NotificationInput, NotificationTargetAudience } from '@/types/notification'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface ApiResponse<T> {
  data: T
}

async function request<T>(path: string, options?: RequestInit) {
  const response = await authenticatedFetch(`${apiBaseUrl}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.message ?? `Notification request failed (${response.status})`)
  }

  const result = (await response.json()) as ApiResponse<T>
  return result.data
}

export function getNotifications(targetAudience?: NotificationTargetAudience) {
  const query = targetAudience ? `?targetAudience=${encodeURIComponent(targetAudience)}` : ''
  return request<Notification[]>(`/api/notifications${query}`)
}

export function createNotification(input: NotificationInput) {
  return request<Notification>('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
