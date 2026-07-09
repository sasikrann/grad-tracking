export type NotificationTargetAudience =
  | 'All Students'
  | 'Master Students'
  | 'Doctoral Students'

export interface Notification {
  notificationId: string
  title: string
  message: string
  attachmentUrl: string | null
  targetAudience: NotificationTargetAudience
  sendEmail: boolean
  emailSentAt: string | null
  createdBy: string | null
  milestoneId?: string | null
  reminderStage?: string | null
  createdAt: string
  sentAt: string | null
}

export interface StudentNotification extends Notification {
  readAt: string | null
  isRead: boolean
}

export interface NotificationInput {
  title: string
  message: string
  targetAudience: NotificationTargetAudience
  attachmentUrl?: string | null
  sendEmail: boolean
}

export interface NotificationReadRecord {
  notificationId: string
  userId: string
  readAt: string
}
