import { randomUUID } from 'node:crypto'
import path from 'node:path'

import pool from '../config/database.js'
import { sendNotificationEmail } from './email.service.js'
import { findNotificationEmailRecipients } from './notification-recipient.service.js'

let notificationSchemaReady
const notificationAttachmentDirectory = path.resolve('uploads/notifications')
const safeAttachmentFileNamePattern = /^[a-zA-Z0-9._-]+$/

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

function notificationEmailAttachment(attachmentUrl) {
  if (!attachmentUrl) return null

  const pathname = new URL(String(attachmentUrl), 'http://localhost').pathname
  const encodedFileName = pathname.match(
    /\/(?:uploads\/notifications|api\/notifications\/attachments)\/([^/]+)$/i,
  )?.[1]
  if (!encodedFileName) throw new Error('Notification attachment URL is invalid')

  const fileName = decodeURIComponent(encodedFileName)
  if (!safeAttachmentFileNamePattern.test(fileName)) {
    throw new Error('Notification attachment file name is invalid')
  }

  const filePath = path.resolve(notificationAttachmentDirectory, fileName)
  if (path.dirname(filePath) !== notificationAttachmentDirectory) {
    throw new Error('Notification attachment path is invalid')
  }

  return { fileName, filePath }
}

export async function findNotificationAttachmentForUser(fileName, user) {
  await ensureNotificationSchema()

  const attachmentUrl = `/uploads/notifications/${fileName}`
  const escapedFileName = fileName.replace(/[\\%_]/g, '\\$&')
  const legacyAttachmentPattern = `%/uploads/notifications/${escapedFileName}`
  if (user.role === 'admin') {
    const result = await pool.query(
      `SELECT attachment_url AS "attachmentUrl"
       FROM notifications
       WHERE attachment_url = $1
          OR attachment_url LIKE $2 ESCAPE '\\'
       LIMIT 1`,
      [attachmentUrl, legacyAttachmentPattern],
    )
    return result.rows[0] || null
  }

  if (user.role !== 'student') return null

  const result = await pool.query(
    `
      SELECT n.attachment_url AS "attachmentUrl"
      FROM users u
      JOIN students s ON s.user_id = u.user_id
      JOIN notifications n ON ${audienceFilterForStudent('n')}
      WHERE u.user_id = $1
        AND (
          n.attachment_url = $2
          OR n.attachment_url LIKE $3 ESCAPE '\\'
        )
      LIMIT 1
    `,
    [user.userId, attachmentUrl, legacyAttachmentPattern],
  )
  return result.rows[0] || null
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
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    let result = await client.query(
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

    if (input.sendEmail) {
      const recipients = await findNotificationEmailRecipients(client, input.targetAudience)

      await sendNotificationEmail({
        recipients,
        title: input.title,
        message: input.message,
        attachment: notificationEmailAttachment(input.attachmentUrl),
      })

      result = await client.query(
        `
          UPDATE notifications
          SET email_sent_at = NOW()
          WHERE notification_id = $1
          RETURNING ${returningNotificationColumns}
        `,
        [notificationId],
      )
    }

    await client.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    if (input.sendEmail && !error.statusCode) {
      error.statusCode = 502
      error.message = `Unable to send notification email: ${error.message}`
    }
    throw error
  } finally {
    client.release()
  }
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
