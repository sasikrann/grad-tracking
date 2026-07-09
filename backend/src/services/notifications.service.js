import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'

let notificationSchemaReady

const notificationColumns = `
  n.notification_id AS "notificationId",
  n.title,
  n.message,
  n.attachment_url AS "attachmentUrl",
  n.target_audience AS "targetAudience",
  n.send_email AS "sendEmail",
  n.email_sent_at AS "emailSentAt",
  n.created_by AS "createdBy",
  n.milestone_id AS "milestoneId",
  n.reminder_stage AS "reminderStage",
  n.created_at AS "createdAt",
  n.sent_at AS "sentAt"
`

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

export async function ensureNotificationSchema() {
  notificationSchemaReady ??= pool.query(`
    ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES milestone_templates(milestone_id) ON DELETE CASCADE
  `)
    .then(() => pool.query(`
      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS reminder_stage VARCHAR
    `))
    .then(() => pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS notifications_milestone_reminder_unique
      ON notifications(milestone_id, reminder_stage)
    `))

  await notificationSchemaReady
}

function audienceFilterForStudent(alias = 'n') {
  return `
    (
      ${alias}.target_audience = 'All Students'
      OR (${alias}.target_audience = 'Master Students' AND s.degree_level = 'Master')
      OR (${alias}.target_audience = 'Doctoral Students' AND s.degree_level = 'Doctoral')
    )
  `
}

export async function findNotificationsForAdmin({ targetAudience } = {}) {
  await ensureNotificationSchema()

  const values = []
  const filters = []

  if (targetAudience) {
    values.push(targetAudience)
    filters.push(`n.target_audience = $${values.length}`)
  }

  const result = await pool.query(
    `
      SELECT ${notificationColumns}
      FROM notifications n
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY n.created_at DESC
    `,
    values,
  )

  return result.rows
}

export async function findNotificationsForStudent(userId) {
  await ensureNotificationSchema()

  const result = await pool.query(
    `
      SELECT
        ${notificationColumns},
        nr.read_at AS "readAt",
        (nr.read_at IS NOT NULL) AS "isRead"
      FROM users u
      JOIN students s ON s.user_id = u.user_id
      JOIN notifications n ON ${audienceFilterForStudent('n')}
      LEFT JOIN notification_reads nr
        ON nr.notification_id = n.notification_id
        AND nr.user_id = u.user_id
      WHERE u.user_id = $1
      ORDER BY n.created_at DESC
    `,
    [userId],
  )

  return result.rows
}

export async function countUnreadNotificationsForStudent(userId) {
  await ensureNotificationSchema()

  const result = await pool.query(
    `
      SELECT COUNT(*)::INT AS count
      FROM users u
      JOIN students s ON s.user_id = u.user_id
      JOIN notifications n ON ${audienceFilterForStudent('n')}
      LEFT JOIN notification_reads nr
        ON nr.notification_id = n.notification_id
        AND nr.user_id = u.user_id
      WHERE u.user_id = $1
        AND nr.notification_id IS NULL
    `,
    [userId],
  )

  return result.rows[0]?.count ?? 0
}

export async function findNotificationByIdForUser(notificationId, user) {
  await ensureNotificationSchema()

  if (user.role === 'admin') {
    const result = await pool.query(
      `
        SELECT ${notificationColumns}
        FROM notifications n
        WHERE n.notification_id = $1
      `,
      [notificationId],
    )

    return result.rows[0] || null
  }

  const result = await pool.query(
    `
      SELECT
        ${notificationColumns},
        nr.read_at AS "readAt",
        (nr.read_at IS NOT NULL) AS "isRead"
      FROM users u
      JOIN students s ON s.user_id = u.user_id
      JOIN notifications n ON ${audienceFilterForStudent('n')}
      LEFT JOIN notification_reads nr
        ON nr.notification_id = n.notification_id
        AND nr.user_id = u.user_id
      WHERE u.user_id = $1
        AND n.notification_id = $2
    `,
    [user.userId, notificationId],
  )

  return result.rows[0] || null
}

export async function createNotification(input, createdBy) {
  await ensureNotificationSchema()

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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING ${returningNotificationColumns}
    `,
    [
      notificationId,
      input.title,
      input.message,
      input.attachmentUrl,
      input.targetAudience,
      input.sendEmail,
      createdBy,
      input.milestoneId ?? null,
      input.reminderStage ?? null,
    ],
  )

  return result.rows[0]
}

function targetAudienceForDegreeLevel(degreeLevel) {
  return degreeLevel === 'Doctoral' ? 'Doctoral Students' : 'Master Students'
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

function milestoneReminderContent(milestone, reminderStage) {
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

export async function markNotificationAsRead(notificationId, userId) {
  await ensureNotificationSchema()

  const visible = await pool.query(
    `
      SELECT 1
      FROM users u
      JOIN students s ON s.user_id = u.user_id
      JOIN notifications n ON ${audienceFilterForStudent('n')}
      WHERE u.user_id = $1
        AND n.notification_id = $2
    `,
    [userId, notificationId],
  )

  if (!visible.rowCount) return null

  const result = await pool.query(
    `
      INSERT INTO notification_reads (notification_id, user_id, read_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (notification_id, user_id)
      DO UPDATE SET read_at = EXCLUDED.read_at
      RETURNING
        notification_id AS "notificationId",
        user_id AS "userId",
        read_at AS "readAt"
    `,
    [notificationId, userId],
  )

  return result.rows[0]
}

export async function markAllNotificationsAsRead(userId) {
  await ensureNotificationSchema()

  const result = await pool.query(
    `
      INSERT INTO notification_reads (notification_id, user_id, read_at)
      SELECT n.notification_id, u.user_id, NOW()
      FROM users u
      JOIN students s ON s.user_id = u.user_id
      JOIN notifications n ON ${audienceFilterForStudent('n')}
      WHERE u.user_id = $1
      ON CONFLICT (notification_id, user_id)
      DO UPDATE SET read_at = EXCLUDED.read_at
      RETURNING notification_id
    `,
    [userId],
  )

  return result.rowCount
}
