import { describe, expect, it } from 'vitest'

import { translate, type AppLanguage } from '@/lang'
import type { Notification } from '@/types/notification'
import {
  formatNotificationDate,
  formatNotificationDateTime,
  notificationDisplayDescription,
  notificationDisplayFooter,
  notificationDisplayTitle,
} from '@/utils/notification-display'

const automaticNotification: Notification = {
  notificationId: 'notification-1',
  title: 'New Milestone Added: Test Milestone',
  message: 'A new milestone "Test Milestone" has been added.',
  attachmentUrl: null,
  targetAudience: 'Master Students',
  sendEmail: false,
  emailSentAt: null,
  createdBy: null,
  milestoneId: 'milestone-1',
  reminderStage: 'created',
  milestoneTitle: 'Test Milestone',
  milestoneDeadline: '2026-09-30',
  createdAt: '2026-09-14T00:00:00.000Z',
  sentAt: '2026-09-14T00:00:00.000Z',
}

function translator(language: AppLanguage) {
  return (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
    translate(language, key, params)
}

describe('localized notification display', () => {
  it('renders an automatic notification in the selected language without translating its name', () => {
    expect(notificationDisplayTitle(automaticNotification, translator('en'))).toBe(
      'New Milestone Added: Test Milestone',
    )
    expect(notificationDisplayTitle(automaticNotification, translator('th'))).toBe(
      'เพิ่มขั้นตอนการศึกษาใหม่: Test Milestone',
    )
    expect(notificationDisplayDescription(automaticNotification, translator('th'))).toContain(
      'Test Milestone',
    )
    expect(notificationDisplayFooter(automaticNotification, translator('th'))).toBe(
      'โปรดตรวจสอบรายละเอียดและเตรียมเอกสารที่จำเป็น',
    )
  })

  it('keeps an administrator-authored notification unchanged in both languages', () => {
    const manual = {
      ...automaticNotification,
      title: 'Original admin title',
      message: 'ข้อความต้นฉบับ from admin',
      milestoneId: null,
      reminderStage: null,
      milestoneTitle: null,
    }

    expect(notificationDisplayTitle(manual, translator('en'))).toBe(manual.title)
    expect(notificationDisplayTitle(manual, translator('th'))).toBe(manual.title)
    expect(notificationDisplayDescription(manual, translator('en'))).toBe(manual.message)
    expect(notificationDisplayDescription(manual, translator('th'))).toBe(manual.message)
  })

  it('formats Thai dates with a Thai month and Buddhist year and English dates with Gregorian year', () => {
    const thaiDate = formatNotificationDate('2026-09-14', 'th')
    const englishDate = formatNotificationDate('2026-09-14', 'en')

    expect(thaiDate).toContain('ก.ย.')
    expect(thaiDate).toContain('2569')
    expect(englishDate).toContain('Sep')
    expect(englishDate).toContain('2026')
    expect(formatNotificationDateTime('2026-09-14T13:31:00+07:00', 'th')).toContain('2569')
    expect(formatNotificationDateTime('2026-09-14T13:31:00+07:00', 'en')).toContain('2026')
  })
})
