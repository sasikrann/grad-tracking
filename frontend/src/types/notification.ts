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
  createdBy: string
  createdAt: string
  sentAt: string | null
}

export interface NotificationInput {
  title: string
  message: string
  targetAudience: NotificationTargetAudience
  attachmentUrl?: string | null
  sendEmail: boolean
}
