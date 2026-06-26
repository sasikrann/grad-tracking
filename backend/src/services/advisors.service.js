import pool from '../config/database.js'

const advisorColumns = `
  a.advisor_id AS "advisorId",
  a.user_id AS "userId",
  a.full_name AS "fullName",
  a.email,
  a.created_at AS "createdAt"
`

export async function findAllAdvisors() {
  const result = await pool.query(`
    SELECT ${advisorColumns}
    FROM advisors a
    INNER JOIN users u ON u.user_id = a.user_id AND u.role = 'advisor'
    ORDER BY full_name ASC
  `)

  return result.rows
}

export async function findAdvisorById(advisorId) {
  const result = await pool.query(
    `
      SELECT ${advisorColumns}
      FROM advisors a
      INNER JOIN users u ON u.user_id = a.user_id AND u.role = 'advisor'
      WHERE advisor_id = $1
    `,
    [advisorId],
  )

  return result.rows[0] || null
}

export async function resolveAdvisorReference(client, { advisorId, advisorEmail, advisorName } = {}) {
  const normalizedAdvisorId = String(advisorId ?? '').trim()
  const normalizedEmail = String(advisorEmail ?? '').trim().toLowerCase()
  const normalizedName = String(advisorName ?? '').trim()

  if (normalizedAdvisorId) {
    const result = await client.query(
      `
        SELECT a.advisor_id
        FROM advisors a
        INNER JOIN users u ON u.user_id = a.user_id AND u.role = 'advisor'
        WHERE a.advisor_id = $1
      `,
      [normalizedAdvisorId],
    )
    if (!result.rowCount) {
      const error = new Error(`Advisor ${normalizedAdvisorId} does not exist`)
      error.statusCode = 400
      throw error
    }
    return normalizedAdvisorId
  }

  if (normalizedEmail) {
    const result = await client.query(
      `
        SELECT a.advisor_id
        FROM advisors a
        INNER JOIN users u ON u.user_id = a.user_id AND u.role = 'advisor'
        WHERE LOWER(a.email) = $1
      `,
      [normalizedEmail],
    )
    if (!result.rowCount) {
      const error = new Error(`Advisor email ${normalizedEmail} does not exist`)
      error.statusCode = 400
      throw error
    }
    return result.rows[0].advisor_id
  }

  if (normalizedName) {
    const result = await client.query(
      `
        SELECT a.advisor_id
        FROM advisors a
        INNER JOIN users u ON u.user_id = a.user_id AND u.role = 'advisor'
        WHERE LOWER(a.full_name) = LOWER($1)
      `,
      [normalizedName],
    )

    if (!result.rowCount) {
      const error = new Error(`Advisor ${normalizedName} does not exist`)
      error.statusCode = 400
      throw error
    }

    if (result.rowCount > 1) {
      const error = new Error(
        `Advisor name ${normalizedName} matches multiple advisors. Please use Advisor Email instead`,
      )
      error.statusCode = 400
      throw error
    }

    return result.rows[0].advisor_id
  }

  return null
}
