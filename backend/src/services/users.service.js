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

export async function insertUser({ email, fullName, role }) {
  const result = await pool.query(
    `
      INSERT INTO users (user_id, email, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING ${userColumns}
    `,
    [randomUUID(), email, fullName, role],
  )

  return result.rows[0]
}

export async function replaceUser(userId, { email, fullName, role }) {
  const result = await pool.query(
    `
      UPDATE users
      SET email = $2, full_name = $3, role = $4
      WHERE user_id = $1
      RETURNING ${userColumns}
    `,
    [userId, email, fullName, role],
  )

  return result.rows[0] || null
}

export async function removeUser(userId) {
  const result = await pool.query(
    'DELETE FROM users WHERE user_id = $1 RETURNING user_id',
    [userId],
  )

  return result.rowCount > 0
}
