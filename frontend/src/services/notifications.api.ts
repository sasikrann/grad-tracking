import { apiRequest, resolveApiUrl } from '@/services/api-client'
import type {
  Notification,
  NotificationInput,
  NotificationReadRecord,
  NotificationTargetAudience,
  StudentNotification,
} from '@/types/notification'

const request = <T>(path: string, options?: RequestInit) =>
  apiRequest<T>(path, { ...options, errorMessage: 'Notification request failed' })

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

export function uploadNotificationAttachment(file: File) {
  const body = new FormData()
  body.append('file', file)

  return request<{ fileName: string; url: string }>('/api/notifications/attachments', {
    method: 'POST',
    body,
  })
}

export function resolveNotificationAttachmentUrl(attachmentUrl: string) {
  const protectedPath = attachmentUrl.replace(
    /^\/uploads\/notifications\//,
    '/api/notifications/attachments/',
  )
  return resolveApiUrl(protectedPath)
}

export function getMyNotifications() {
  return request<StudentNotification[]>('/api/notifications')
}

export function getUnreadNotificationCount() {
  return request<{ count: number }>('/api/notifications/unread-count')
}

export function markNotificationAsRead(notificationId: string) {
  return request<NotificationReadRecord>(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })
}

export function markAllNotificationsAsRead() {
  return request<{ updatedRecords: number }>('/api/notifications/read-all', {
    method: 'PATCH',
  })
}
