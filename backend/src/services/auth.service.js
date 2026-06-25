import pool from '../config/database.js'

export async function findAuthorizedUserByEmail(email) {
  const result = await pool.query(
    `
      SELECT
        u.user_id AS "userId",
        u.email,
        u.full_name AS "fullName",
        u.role,
        a.advisor_id AS "advisorId"
      FROM users u
      LEFT JOIN advisors a ON a.user_id = u.user_id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1
    `,
    [email],
  )

  return result.rows[0] || null
}

export async function findAdvisorIdByUserId(userId) {
  const result = await pool.query(
    'SELECT advisor_id AS "advisorId" FROM advisors WHERE user_id = $1',
    [userId],
  )

  return result.rows[0]?.advisorId ?? null
}
