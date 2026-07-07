export type NotificationTargetAudience = 'All Students' | 'Master Students' | 'Doctoral Students'

export interface StudentNotification {
  notificationId: string
  title: string
  message: string
  attachmentUrl: string | null
  targetAudience: NotificationTargetAudience
  sendEmail: boolean
  emailSentAt: string | null
  createdBy: string
  createdAt: string
  sentAt: string | null
  readAt: string | null
  isRead: boolean
}

export interface NotificationReadRecord {
  notificationId: string
  userId: string
  readAt: string
}
