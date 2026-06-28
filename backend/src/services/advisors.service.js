import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'

const advisorColumns = `
  a.advisor_id AS "advisorId",
  a.user_id AS "userId",
  a.full_name AS "fullName",
  a.email,
  a.created_at AS "createdAt"
`

function advisorNumber(advisorId) {
  const match = String(advisorId ?? '').trim().match(/^ADV0*(\d+)$/i)
  return match ? Number(match[1]) : null
}

export async function findAllAdvisors() {
  await ensureAdvisorProfilesForAdvisorUsers()

  const result = await pool.query(`
    SELECT ${advisorColumns}
    FROM advisors a
    INNER JOIN users u ON u.user_id = a.user_id AND u.role = 'advisor'
    ORDER BY
      CASE
        WHEN a.advisor_id ~* '^ADV[0-9]+$'
          THEN CAST(SUBSTRING(a.advisor_id FROM 4) AS INT)
        ELSE NULL
      END NULLS LAST,
      a.advisor_id
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

async function generateAdvisorId(client) {
  await client.query('SELECT pg_advisory_xact_lock(2026062801)')
  const result = await client.query(`
    SELECT advisor_id
    FROM advisors
    WHERE advisor_id ~* '^ADV[0-9]+$'
  `)
  const usedNumbers = new Set(
    result.rows.map((row) => advisorNumber(row.advisor_id)).filter(Number.isInteger),
  )
  let nextAdvisorNumber = 1

  while (usedNumbers.has(nextAdvisorNumber)) {
    nextAdvisorNumber += 1
  }

  return `ADV${String(nextAdvisorNumber).padStart(3, '0')}`
}

async function ensureAdvisorProfilesForAdvisorUsers() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const missingAdvisorUsers = await client.query(`
      SELECT u.user_id, u.email, u.full_name
      FROM users u
      LEFT JOIN advisors a ON a.user_id = u.user_id
      WHERE u.role = 'advisor'
        AND a.advisor_id IS NULL
      ORDER BY u.created_at, u.email
      FOR UPDATE OF u
    `)

    for (const user of missingAdvisorUsers.rows) {
      const advisorId = await generateAdvisorId(client)
      await client.query(
        `
          INSERT INTO advisors (advisor_id, user_id, full_name, email)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (email) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            full_name = EXCLUDED.full_name
        `,
        [advisorId, user.user_id, user.full_name, user.email],
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function upsertAdvisorWithClient(client, input) {
  const requestedAdvisorId = String(input.advisorId ?? '').trim()
  const email = String(input.email ?? '').trim().toLowerCase()
  const fullName = String(input.fullName ?? '').trim()
  const existingAdvisorByEmail = await client.query(
    'SELECT advisor_id, user_id FROM advisors WHERE LOWER(email) = $1',
    [email],
  )
  const advisorId = requestedAdvisorId || existingAdvisorByEmail.rows[0]?.advisor_id || (await generateAdvisorId(client))

  const existingAdvisor = await client.query('SELECT user_id FROM advisors WHERE advisor_id = $1', [
    advisorId,
  ])
  const existingUser = await client.query('SELECT user_id, role FROM users WHERE email = $1', [email])
  const advisorUserId = existingAdvisor.rows[0]?.user_id || existingAdvisorByEmail.rows[0]?.user_id
  const emailUser = existingUser.rows[0]

  if (emailUser && emailUser.role !== 'advisor') {
    const error = new Error(`Email ${email} belongs to a ${emailUser.role} account`)
    error.statusCode = 409
    throw error
  }

  if (advisorUserId && emailUser?.user_id && advisorUserId !== emailUser.user_id) {
    const error = new Error(`Email ${email} belongs to another user`)
    error.statusCode = 409
    throw error
  }

  const userId = advisorUserId || emailUser?.user_id || randomUUID()

  const linkedAdvisor = await client.query(
    'SELECT advisor_id FROM advisors WHERE user_id = $1 AND advisor_id <> $2',
    [userId, advisorId],
  )

  if (linkedAdvisor.rowCount) {
    const error = new Error(
      `Email ${email} is already assigned to advisor ${linkedAdvisor.rows[0].advisor_id}`,
    )
    error.statusCode = 409
    throw error
  }

  await client.query(
    `
      INSERT INTO users (user_id, email, full_name, role)
      VALUES ($1, $2, $3, 'advisor')
      ON CONFLICT (user_id) DO UPDATE
      SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = 'advisor'
    `,
    [userId, email, fullName],
  )

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

  return advisorId
}

export async function insertAdvisor(input) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const advisorId = await upsertAdvisorWithClient(client, input)
    await client.query('COMMIT')
    return findAdvisorById(advisorId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function replaceAdvisor(advisorId, input) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT 1 FROM advisors WHERE advisor_id = $1', [advisorId])
    if (!existing.rowCount) {
      await client.query('ROLLBACK')
      return null
    }
    await upsertAdvisorWithClient(client, { ...input, advisorId })
    await client.query('COMMIT')
    return findAdvisorById(advisorId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function removeAdvisor(advisorId) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await client.query('SELECT user_id FROM advisors WHERE advisor_id = $1 FOR UPDATE', [
      advisorId,
    ])
    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return false
    }
    await client.query('UPDATE students SET advisor_id = NULL, updated_at = NOW() WHERE advisor_id = $1', [
      advisorId,
    ])
    await client.query('UPDATE student_milestones SET reviewed_by = NULL WHERE reviewed_by = $1', [advisorId])
    await client.query('DELETE FROM advisors WHERE advisor_id = $1', [advisorId])
    await client.query('DELETE FROM users WHERE user_id = $1', [result.rows[0].user_id])
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function importAdvisors(records, { fileName, importedBy }) {
  const client = await pool.connect()
  const importId = randomUUID()
  let successRecords = 0
  const errors = []

  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO import_logs
        (import_id, imported_by, import_type, file_name, total_records)
       VALUES ($1, $2, 'advisor', $3, $4)`,
      [importId, importedBy, fileName, records.length],
    )

    for (const [index, record] of records.entries()) {
      const savepoint = `advisor_row_${index}`
      await client.query(`SAVEPOINT ${savepoint}`)
      try {
        await upsertAdvisorWithClient(client, record)
        successRecords += 1
        await client.query(`RELEASE SAVEPOINT ${savepoint}`)
      } catch (error) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`)
        errors.push(`Row ${index + 2}: ${error.message}`)
      }
    }

    await client.query(
      `UPDATE import_logs SET
        success_records = $2,
        failed_records = $3,
        error_message = $4
       WHERE import_id = $1`,
      [importId, successRecords, errors.length, errors.length ? errors.join('\n') : null],
    )
    await client.query('COMMIT')

    return {
      importId,
      totalRecords: records.length,
      successRecords,
      failedRecords: errors.length,
      errors,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
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
