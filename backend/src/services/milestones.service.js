import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'

let schemaReady

const milestoneColumns = `
  milestone_id AS "milestoneId",
  degree_level AS "degreeLevel",
  semester,
  title,
  description,
  sequence_order AS "sequenceOrder",
  open_date AS "openDate",
  deadline,
  first_reminder_date AS "firstReminderDate",
  second_reminder_date AS "secondReminderDate",
  is_enabled AS "isEnabled",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

async function ensureMilestoneSchema() {
  schemaReady ??= pool.query(`
    ALTER TABLE milestone_templates
    ADD COLUMN IF NOT EXISTS semester VARCHAR NOT NULL DEFAULT '1'
  `)
  await schemaReady
}

export async function findMilestones({ degreeLevel, semester } = {}) {
  await ensureMilestoneSchema()

  const conditions = []
  const values = []

  if (degreeLevel) {
    values.push(degreeLevel)
    conditions.push(`degree_level = $${values.length}`)
  }

  if (semester) {
    values.push(semester)
    conditions.push(`semester = $${values.length}`)
  }

  const filter = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await pool.query(
    `
      SELECT ${milestoneColumns}
      FROM milestone_templates
      ${filter}
      ORDER BY degree_level, semester, sequence_order, created_at
    `,
    values,
  )

  return result.rows
}

export async function findMilestoneById(milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT ${milestoneColumns}
      FROM milestone_templates
      WHERE milestone_id = $1
    `,
    [milestoneId],
  )

  return result.rows[0] || null
}

export async function nextSequenceOrder(degreeLevel, semester = '1') {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT COALESCE(MAX(sequence_order), 0) + 1 AS "nextOrder"
      FROM milestone_templates
      WHERE degree_level = $1 AND semester = $2
    `,
    [degreeLevel, semester],
  )

  return result.rows[0].nextOrder
}

export async function createMilestone(input) {
  await ensureMilestoneSchema()

  const milestoneId = randomUUID()
  const sequenceOrder =
    input.sequenceOrder || (await nextSequenceOrder(input.degreeLevel, input.semester))

  await pool.query(
    `
      INSERT INTO milestone_templates (
        milestone_id, degree_level, semester, title, description, sequence_order,
        open_date, deadline, first_reminder_date, second_reminder_date, is_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      milestoneId,
      input.degreeLevel,
      input.semester,
      input.title,
      input.description,
      sequenceOrder,
      input.openDate,
      input.deadline,
      input.firstReminderDate,
      input.secondReminderDate,
      input.isEnabled,
    ],
  )

  return findMilestoneById(milestoneId)
}

export async function updateMilestone(milestoneId, input) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      UPDATE milestone_templates
      SET
        degree_level = $2,
        semester = $3,
        title = $4,
        description = $5,
        sequence_order = $6,
        open_date = $7,
        deadline = $8,
        first_reminder_date = $9,
        second_reminder_date = $10,
        is_enabled = $11,
        updated_at = NOW()
      WHERE milestone_id = $1
    `,
    [
      milestoneId,
      input.degreeLevel,
      input.semester,
      input.title,
      input.description,
      input.sequenceOrder,
      input.openDate,
      input.deadline,
      input.firstReminderDate,
      input.secondReminderDate,
      input.isEnabled,
    ],
  )

  if (!result.rowCount) return null
  return findMilestoneById(milestoneId)
}

export async function removeMilestone(milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query('DELETE FROM milestone_templates WHERE milestone_id = $1', [
    milestoneId,
  ])
  return result.rowCount > 0
}

export async function setMilestoneEnabled(milestoneId, isEnabled) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      UPDATE milestone_templates
      SET is_enabled = $2, updated_at = NOW()
      WHERE milestone_id = $1
    `,
    [milestoneId, isEnabled],
  )

  if (!result.rowCount) return null
  return findMilestoneById(milestoneId)
}

export async function moveMilestone(milestoneId, direction) {
  await ensureMilestoneSchema()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const current = await client.query(
      'SELECT milestone_id, degree_level, semester, sequence_order FROM milestone_templates WHERE milestone_id = $1 FOR UPDATE',
      [milestoneId],
    )
    const milestone = current.rows[0]
    if (!milestone) {
      await client.query('ROLLBACK')
      return null
    }

    const operator = direction === 'up' ? '<' : '>'
    const order = direction === 'up' ? 'DESC' : 'ASC'
    const neighbor = await client.query(
      `
        SELECT milestone_id, sequence_order
        FROM milestone_templates
        WHERE degree_level = $1 AND semester = $2 AND sequence_order ${operator} $3
        ORDER BY sequence_order ${order}
        LIMIT 1
        FOR UPDATE
      `,
      [milestone.degree_level, milestone.semester, milestone.sequence_order],
    )

    const target = neighbor.rows[0]
    if (!target) {
      await client.query('COMMIT')
      return findMilestoneById(milestoneId)
    }

    await client.query('UPDATE milestone_templates SET sequence_order = $2, updated_at = NOW() WHERE milestone_id = $1', [
      milestone.milestone_id,
      target.sequence_order,
    ])
    await client.query('UPDATE milestone_templates SET sequence_order = $2, updated_at = NOW() WHERE milestone_id = $1', [
      target.milestone_id,
      milestone.sequence_order,
    ])

    await client.query('COMMIT')
    return findMilestoneById(milestoneId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function copyMilestones({
  fromDegreeLevel,
  toDegreeLevel,
  fromSemester = null,
  toSemester = '1',
  milestoneIds = [],
}) {
  await ensureMilestoneSchema()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const values = [fromDegreeLevel]
    const semesterFilter = fromSemester ? `AND semester = $${values.length + 1}` : ''
    if (fromSemester) values.push(fromSemester)

    const selectedFilter = milestoneIds.length
      ? `AND milestone_id = ANY($${values.length + 1}::uuid[])`
      : ''
    if (milestoneIds.length) values.push(milestoneIds)

    const source = await client.query(
      `
        SELECT milestone_id, title, description, sequence_order, open_date, deadline,
          first_reminder_date, second_reminder_date, is_enabled
        FROM milestone_templates
        WHERE degree_level = $1
        ${semesterFilter}
        ${selectedFilter}
        ORDER BY sequence_order
      `,
      values,
    )

    for (const row of source.rows) {
      await client.query(
        `
          INSERT INTO milestone_templates (
            milestone_id, degree_level, semester, title, description, sequence_order,
            open_date, deadline, first_reminder_date, second_reminder_date, is_enabled
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          randomUUID(),
          toDegreeLevel,
          toSemester,
          row.title,
          row.description,
          row.sequence_order,
          row.open_date,
          row.deadline,
          row.first_reminder_date,
          row.second_reminder_date,
          row.is_enabled,
        ],
      )
    }

    await client.query('COMMIT')
    return source.rowCount
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
