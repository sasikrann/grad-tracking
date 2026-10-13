import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'
import { createMilestoneReminderNotification } from './milestone-notification.service.js'
import { ensureMilestoneSchema } from './milestones.service.js'

function shiftDateToYear(value, year) {
  if (!value || !year) return value

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  date.setUTCFullYear(Number(year))
  return date.toISOString().slice(0, 10)
}

// Copies selected milestones between years without crossing degree or plan boundaries.
export async function copyMilestones({
  degreeLevel,
  educationPlan,
  fromYear,
  toYear,
  fromSemester = null,
  toSemester = '1',
  milestoneIds = [],
}) {
  await ensureMilestoneSchema()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const values = [degreeLevel, fromYear, educationPlan]
    const semesterFilter = fromSemester ? `AND semester = $${values.length + 1}` : ''
    if (fromSemester) values.push(fromSemester)

    const selectedFilter = milestoneIds.length
      ? `AND milestone_id = ANY($${values.length + 1}::uuid[])`
      : ''
    if (milestoneIds.length) values.push(milestoneIds)

    const source = await client.query(
      `SELECT milestone_id, evidence_code, title, description, reference_urls, sequence_order,
         open_date, deadline, first_reminder_date, second_reminder_date, is_enabled,
         prerequisite_milestone_ids
       FROM milestone_templates
       WHERE degree_level = $1
         AND academic_year = $2
         AND $3 = ANY(plans)
         ${semesterFilter}
         ${selectedFilter}
       ORDER BY sequence_order`,
      values,
    )

    await client.query(
      `SELECT milestone_id
       FROM milestone_templates
       WHERE degree_level = $1
         AND academic_year = $2
         AND $3 = ANY(plans)
         AND semester = $4
         AND default_template_key IS NOT NULL
       FOR UPDATE`,
      [degreeLevel, toYear, educationPlan, toSemester],
    )

    const orderResult = await client.query(
      `SELECT COALESCE(MAX(sequence_order), 0) AS "maxOrder"
       FROM milestone_templates
       WHERE degree_level = $1
         AND academic_year = $2
         AND $3 = ANY(plans)
         AND semester = $4
         AND default_template_key IS NOT NULL`,
      [degreeLevel, toYear, educationPlan, toSemester],
    )
    let nextOrder = Number(orderResult.rows[0].maxOrder) + 1
    const copiedIdBySourceId = new Map(
      source.rows.map((row) => [row.milestone_id, randomUUID()]),
    )
    const copiedMilestones = []

    for (const row of source.rows) {
      const milestoneId = copiedIdBySourceId.get(row.milestone_id)
      const copiedMilestone = {
        milestoneId,
        academicYear: toYear,
        degreeLevel,
        semester: toSemester,
        plans: [educationPlan],
        prerequisiteMilestoneIds: row.prerequisite_milestone_ids
          .map((prerequisiteId) => copiedIdBySourceId.get(prerequisiteId))
          .filter(Boolean),
        evidenceCode: row.evidence_code,
        title: row.title,
        description: row.description,
        references: row.reference_urls,
        sequenceOrder: nextOrder,
        openDate: shiftDateToYear(row.open_date, toYear),
        deadline: shiftDateToYear(row.deadline, toYear),
        firstReminderDate: shiftDateToYear(row.first_reminder_date, toYear),
        secondReminderDate: shiftDateToYear(row.second_reminder_date, toYear),
        isEnabled: row.is_enabled,
      }

      await client.query(
        `INSERT INTO milestone_templates (
          milestone_id, default_template_key, degree_level, semester, plans,
          prerequisite_milestone_ids, academic_year, evidence_code, title, description,
          reference_urls, sequence_order, open_date, deadline, first_reminder_date,
          second_reminder_date, is_enabled
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          copiedMilestone.milestoneId,
          `copy-${copiedMilestone.milestoneId}`,
          copiedMilestone.degreeLevel,
          copiedMilestone.semester,
          copiedMilestone.plans,
          copiedMilestone.prerequisiteMilestoneIds,
          copiedMilestone.academicYear,
          copiedMilestone.evidenceCode,
          copiedMilestone.title,
          copiedMilestone.description,
          copiedMilestone.references,
          copiedMilestone.sequenceOrder,
          copiedMilestone.openDate,
          copiedMilestone.deadline,
          copiedMilestone.firstReminderDate,
          copiedMilestone.secondReminderDate,
          copiedMilestone.isEnabled,
        ],
      )
      copiedMilestones.push(copiedMilestone)
      nextOrder += 1
    }

    await client.query('COMMIT')
    for (const milestone of copiedMilestones) {
      await createMilestoneReminderNotification(milestone, 'created')
    }
    return source.rowCount
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
