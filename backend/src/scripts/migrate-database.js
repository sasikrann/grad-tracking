import { readFile } from 'node:fs/promises'

import pool from '../config/database.js'
import { waitForDatabase } from '../services/bootstrap-admin.service.js'

const migrations = [
  {
    id: '20260923_protective_foreign_keys',
    file: new URL('../../database/protective-foreign-keys.sql', import.meta.url),
  },
  {
    id: '20261013_recalculate_study_extension_end_dates',
    file: new URL('../../database/recalculate-study-extension-end-dates.sql', import.meta.url),
  },
]

await waitForDatabase(pool, {
  onRetry(attempt, attempts) {
    console.info(`Waiting for database before migrations (${attempt}/${attempts})`)
  },
})

const client = await pool.connect()

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_id VARCHAR PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)

  for (const migration of migrations) {
    const applied = await client.query(
      'SELECT 1 FROM schema_migrations WHERE migration_id = $1',
      [migration.id],
    )
    if (applied.rowCount) continue

    await client.query('BEGIN')
    try {
      await client.query(await readFile(migration.file, 'utf8'))
      await client.query(
        'INSERT INTO schema_migrations (migration_id) VALUES ($1)',
        [migration.id],
      )
      await client.query('COMMIT')
      console.info(`Applied database migration: ${migration.id}`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  }
} finally {
  client.release()
  await pool.end()
}
// Applies each pending SQL migration once and records it in the schema_migrations table.
