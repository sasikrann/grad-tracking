import { randomUUID } from 'node:crypto'

import pool from '../../src/config/database.js'
import { bootstrapAdmin } from '../../src/services/bootstrap-admin.service.js'

const expectedDatabase = 'grad_tracking_e2e'

if (process.env.E2E_ALLOW_RESET !== 'true') {
  throw new Error('E2E database reset is disabled. Set E2E_ALLOW_RESET=true only in the test stack.')
}

const databaseResult = await pool.query('SELECT current_database() AS name')
const currentDatabase = databaseResult.rows[0]?.name

if (currentDatabase !== expectedDatabase) {
  throw new Error(`Refusing to reset database: expected ${expectedDatabase}`)
}

const client = await pool.connect()

try {
  await client.query('BEGIN')
  const tableResult = await client.query(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
     ORDER BY tablename`,
  )
  const tableNames = tableResult.rows.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)

  if (tableNames.length) {
    await client.query(`TRUNCATE TABLE ${tableNames.join(', ')} RESTART IDENTITY CASCADE`)
  }

  await client.query('COMMIT')
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
}

await bootstrapAdmin(pool)

const studentEmail = (process.env.E2E_STUDENT_EMAIL ?? 'automation-student@lamduan.mfu.ac.th')
  .trim()
  .toLowerCase()
const studentUserId = randomUUID()
const seedClient = await pool.connect()

try {
  await seedClient.query('BEGIN')
  await seedClient.query(
    `INSERT INTO users (user_id, email, full_name, role)
     VALUES ($1, $2, $3, 'student')`,
    [studentUserId, studentEmail, 'Automation Test Student'],
  )
  await seedClient.query(
    `INSERT INTO students (
       student_id, user_id, full_name, school_name, program, education_plan,
       degree_level, enrollment_academic_year, semester,
       expected_graduation_year, student_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Normal')`,
    [
      '6999999999',
      studentUserId,
      'Automation Test Student',
      'School of Information Technology',
      'Digital Technology',
      '2.2',
      'Doctoral',
      2026,
      '1',
      2029,
    ],
  )
  await seedClient.query('COMMIT')
} catch (error) {
  await seedClient.query('ROLLBACK')
  throw error
} finally {
  seedClient.release()
}

console.info('E2E database seeded with baseline test accounts')
await pool.end()
