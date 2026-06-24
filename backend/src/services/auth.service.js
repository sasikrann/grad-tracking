import pool from '../config/database.js'

export async function findAuthorizedUserByEmail(email) {
  const result = await pool.query(
    `
      SELECT
        user_id AS "userId",
        email,
        full_name AS "fullName",
        role
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `,
    [email],
  )

  return result.rows[0] || null
}
