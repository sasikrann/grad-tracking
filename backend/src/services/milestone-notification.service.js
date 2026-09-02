import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'
import { ensureNotificationSchema } from './notifications.service.js'

const returningNotificationColumns = `
  notification_id AS "notificationId",
  title,
  message,
  attachment_url AS "attachmentUrl",
  target_audience AS "targetAudience",
  send_email AS "sendEmail",
  email_sent_at AS "emailSentAt",
  created_by AS "createdBy",
  milestone_id AS "milestoneId",
  reminder_stage AS "reminderStage",
  created_at AS "createdAt",
  sent_at AS "sentAt"
`

function targetAudienceForDegreeLevel(degreeLevel) {
  if (degreeLevel === 'Master') return 'Master Students'
  if (degreeLevel === 'Doctoral') return 'Doctoral Students'
  return 'All Students'
}

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function milestoneReminderContent(milestone, reminderStage) {
  const deadline = formatDate(milestone.deadline)
  const title = String(milestone.title ?? '').trim()
  const deadlineText = deadline ? ` Deadline: ${deadline}.` : ''

  if (reminderStage === 'created') {
    return {
      title: `New Milestone Added: ${title}`,
      message: `A new milestone "${title}" has been added.${deadlineText} Please review the milestone details and prepare the required documents.`,
    }
  }

  if (reminderStage === 'first') {
    return {
      title: `First Reminder: ${title}`,
      message: `This is the first reminder for milestone "${title}".${deadlineText} Please review your progress and prepare your submission.`,
    }
  }

  if (reminderStage === 'deadline') {
    return {
      title: `Milestone Deadline: ${title}`,
      message: `Milestone "${title}" has reached its deadline.${deadlineText} Please review the milestone and submit any outstanding evidence.`,
    }
  }

  return {
    title: `Second Reminder: ${title}`,
    message: `This is the second reminder for milestone "${title}".${deadlineText} Please review your progress and prepare your submission.`,
  }
}

export async function createMilestoneReminderNotification(milestone, reminderStage) {
  await ensureNotificationSchema()

  const content = milestoneReminderContent(milestone, reminderStage)
  const notificationId = randomUUID()
  const result = await pool.query(
    `
      INSERT INTO notifications (
        notification_id,
        title,
        message,
        attachment_url,
        target_audience,
        send_email,
        created_by,
        milestone_id,
        reminder_stage,
        sent_at
      )
      VALUES ($1, $2, $3, NULL, $4, FALSE, NULL, $5, $6, NOW())
      ON CONFLICT (milestone_id, reminder_stage) DO NOTHING
      RETURNING ${returningNotificationColumns}
    `,
    [
      notificationId,
      content.title,
      content.message,
      targetAudienceForDegreeLevel(milestone.degreeLevel),
      milestone.milestoneId,
      reminderStage,
    ],
  )

  return result.rows[0] || null
}
