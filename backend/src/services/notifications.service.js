import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'

const notificationColumns = `
  n.notification_id AS "notificationId",
  n.title,
  n.message,
  n.attachment_url AS "attachmentUrl",
  n.target_audience AS "targetAudience",
  n.send_email AS "sendEmail",
  n.email_sent_at AS "emailSentAt",
  n.created_by AS "createdBy",
  n.created_at AS "createdAt",
  n.sent_at AS "sentAt"
`

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
        sent_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING ${notificationColumns}
    `,
    [
      notificationId,
      input.title,
      input.message,
      input.attachmentUrl,
      input.targetAudience,
      input.sendEmail,
      createdBy,
    ],
  )

  return result.rows[0]
}

export async function markNotificationAsRead(notificationId, userId) {
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
