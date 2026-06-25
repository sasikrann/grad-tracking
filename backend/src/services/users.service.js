import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'

const userColumns = `
  user_id AS "userId",
  email,
  full_name AS "fullName",
  role,
  created_at AS "createdAt"
`

export async function findAllUsers() {
  const result = await pool.query(`
    SELECT ${userColumns}
    FROM users
    ORDER BY created_at DESC
  `)

  return result.rows
}

export async function findUserById(userId) {
  const result = await pool.query(
    `SELECT ${userColumns} FROM users WHERE user_id = $1`,
    [userId],
  )

  return result.rows[0] || null
}

async function nextAdvisorId(client) {
  const result = await client.query(`
    SELECT advisor_id
    FROM advisors
    WHERE advisor_id ~ '^ADV[0-9]+$'
    ORDER BY CAST(SUBSTRING(advisor_id FROM 4) AS INT) DESC
    LIMIT 1
  `)

  const lastNumber = Number(result.rows[0]?.advisor_id?.replace('ADV', '') ?? 0)
  return `ADV${String(lastNumber + 1).padStart(3, '0')}`
}

async function upsertAdvisorForUser(client, { userId, email, fullName }) {
  const existing = await client.query(
    'SELECT advisor_id FROM advisors WHERE user_id = $1',
    [userId],
  )
  const advisorId = existing.rows[0]?.advisor_id ?? await nextAdvisorId(client)

  await client.query(
    `
      INSERT INTO advisors (advisor_id, user_id, full_name, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (advisor_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email
    `,
    [advisorId, userId, fullName, email],
  )
}

export async function insertUser({ email, fullName, role }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `
        INSERT INTO users (user_id, email, full_name, role)
        VALUES ($1, $2, $3, $4)
        RETURNING ${userColumns}
      `,
      [randomUUID(), email, fullName, role],
    )

    if (role === 'advisor') {
      await upsertAdvisorForUser(client, result.rows[0])
    }

    await client.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function replaceUser(userId, { email, fullName, role }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `
        UPDATE users
        SET email = $2, full_name = $3, role = $4
        WHERE user_id = $1
        RETURNING ${userColumns}
      `,
      [userId, email, fullName, role],
    )

    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return null
    }

    if (role === 'advisor') {
      await upsertAdvisorForUser(client, result.rows[0])
    }

    await client.query('COMMIT')
    return result.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function removeUser(userId) {
  const result = await pool.query(
    'DELETE FROM users WHERE user_id = $1 RETURNING user_id',
    [userId],
  )

  return result.rowCount > 0
}
