import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'

const milestoneColumns = `
  milestone_id AS "milestoneId",
  degree_level AS "degreeLevel",
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

export async function findMilestones({ degreeLevel } = {}) {
  const values = degreeLevel ? [degreeLevel] : []
  const filter = degreeLevel ? 'WHERE degree_level = $1' : ''

  const result = await pool.query(
    `
      SELECT ${milestoneColumns}
      FROM milestone_templates
      ${filter}
      ORDER BY degree_level, sequence_order, created_at
    `,
    values,
  )

  return result.rows
}

export async function findMilestoneById(milestoneId) {
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

export async function nextSequenceOrder(degreeLevel) {
  const result = await pool.query(
    'SELECT COALESCE(MAX(sequence_order), 0) + 1 AS "nextOrder" FROM milestone_templates WHERE degree_level = $1',
    [degreeLevel],
  )

  return result.rows[0].nextOrder
}

export async function createMilestone(input) {
  const milestoneId = randomUUID()
  const sequenceOrder = input.sequenceOrder || (await nextSequenceOrder(input.degreeLevel))

  await pool.query(
    `
      INSERT INTO milestone_templates (
        milestone_id, degree_level, title, description, sequence_order,
        open_date, deadline, first_reminder_date, second_reminder_date, is_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      milestoneId,
      input.degreeLevel,
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
  const result = await pool.query(
    `
      UPDATE milestone_templates
      SET
        degree_level = $2,
        title = $3,
        description = $4,
        sequence_order = $5,
        open_date = $6,
        deadline = $7,
        first_reminder_date = $8,
        second_reminder_date = $9,
        is_enabled = $10,
        updated_at = NOW()
      WHERE milestone_id = $1
    `,
    [
      milestoneId,
      input.degreeLevel,
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
  const result = await pool.query('DELETE FROM milestone_templates WHERE milestone_id = $1', [
    milestoneId,
  ])
  return result.rowCount > 0
}

export async function setMilestoneEnabled(milestoneId, isEnabled) {
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
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const current = await client.query(
      'SELECT milestone_id, degree_level, sequence_order FROM milestone_templates WHERE milestone_id = $1 FOR UPDATE',
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
        WHERE degree_level = $1 AND sequence_order ${operator} $2
        ORDER BY sequence_order ${order}
        LIMIT 1
        FOR UPDATE
      `,
      [milestone.degree_level, milestone.sequence_order],
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

export async function copyMilestones({ fromDegreeLevel, toDegreeLevel, milestoneIds = [] }) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const values = [fromDegreeLevel]
    const selectedFilter = milestoneIds.length ? 'AND milestone_id = ANY($2::uuid[])' : ''
    if (milestoneIds.length) values.push(milestoneIds)

    const source = await client.query(
      `
        SELECT milestone_id, title, description, sequence_order, open_date, deadline,
          first_reminder_date, second_reminder_date, is_enabled
        FROM milestone_templates
        WHERE degree_level = $1
        ${selectedFilter}
        ORDER BY sequence_order
      `,
      values,
    )

    for (const row of source.rows) {
      await client.query(
        `
          INSERT INTO milestone_templates (
            milestone_id, degree_level, title, description, sequence_order,
            open_date, deadline, first_reminder_date, second_reminder_date, is_enabled
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          randomUUID(),
          toDegreeLevel,
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
