import type { Notification } from '@/types/notification'
import type { TranslationKey } from '@/lang'
import type { AppLanguage } from '@/lang'

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string

type AutomaticStage = 'created' | 'firstReminder' | 'deadline' | 'secondReminder'

function isAutomatic(notification: Notification) {
  return Boolean(notification.milestoneId && notification.reminderStage && notification.milestoneTitle)
}

function stageKey(notification: Notification): AutomaticStage | null {
  if (!isAutomatic(notification)) return null
  if (notification.reminderStage === 'created') return 'created'
  if (notification.reminderStage === 'first') return 'firstReminder'
  if (notification.reminderStage === 'deadline') return 'deadline'
  if (notification.reminderStage === 'second') return 'secondReminder'
  return null
}

export function notificationDisplayTitle(notification: Notification, t: Translate) {
  const stage = stageKey(notification)
  if (!stage) return notification.title
  return t(`notification.automatic.${stage}.title` as TranslationKey, {
    milestone: notification.milestoneTitle ?? '',
  })
}

export function notificationDisplayDescription(notification: Notification, t: Translate) {
  const stage = stageKey(notification)
  if (!stage) return notification.message
  return t(`notification.automatic.${stage}.description` as TranslationKey, {
    milestone: notification.milestoneTitle ?? '',
  })
}

export function notificationDisplayFooter(notification: Notification, t: Translate) {
  const stage = stageKey(notification)
  return stage ? t(`notification.automatic.${stage}.footer` as TranslationKey) : ''
}

export function notificationDisplayDeadline(notification: Notification) {
  return stageKey(notification) ? (notification.milestoneDeadline ?? '') : ''
}

export function notificationDisplayMessage(notification: Notification, t: Translate) {
  if (!stageKey(notification)) return notification.message
  return [notificationDisplayDescription(notification, t), notificationDisplayFooter(notification, t)]
    .filter(Boolean)
    .join(' ')
}

export function formatNotificationDateTime(value: string | null, language: AppLanguage) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
    calendar: language === 'th' ? 'buddhist' : 'gregory',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatNotificationDate(value: string | null, language: AppLanguage) {
  if (!value) return ''
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
    calendar: language === 'th' ? 'buddhist' : 'gregory',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
