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

// Returns the language-neutral title and message keys for a reminder stage.
export function milestoneReminderContent(_milestone, reminderStage) {
  const stage = ['created', 'first', 'deadline', 'second'].includes(reminderStage)
    ? reminderStage
    : 'second'

  return {
    title: `notification.milestone.${stage}.title`,
    message: `notification.milestone.${stage}.message`,
  }
}

// Creates a reminder notification once and sends email when configured.
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
// Creates localized in-app and email notifications for milestone reminder stages.
