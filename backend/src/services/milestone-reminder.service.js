import pool from '../config/database.js'
import { createMilestoneReminderNotification } from './milestone-notification.service.js'
import { ensureMilestoneSchema } from './milestones.service.js'

const milestoneColumns = `
  milestone_id AS "milestoneId",
  academic_year AS "academicYear",
  degree_level AS "degreeLevel",
  semester,
  plans,
  prerequisite_milestone_ids AS "prerequisiteMilestoneIds",
  evidence_code AS "evidenceCode",
  title,
  description,
  reference_urls AS references,
  sequence_order AS "sequenceOrder",
  open_date AS "openDate",
  deadline,
  first_reminder_date AS "firstReminderDate",
  second_reminder_date AS "secondReminderDate",
  is_enabled AS "isEnabled",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

export function normalizeReminderDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDueReminderStages(milestone, targetDate) {
  const stages = []
  const stageDates = [
    ['first', normalizeReminderDate(milestone.firstReminderDate)],
    ['second', normalizeReminderDate(milestone.secondReminderDate)],
    ['deadline', normalizeReminderDate(milestone.deadline)],
  ]

  for (const [stage, stageDate] of stageDates) {
    if (stageDate && stageDate <= targetDate) stages.push(stage)
  }

  return stages
}

export async function createDueMilestoneReminderNotifications(date = null) {
  await ensureMilestoneSchema()

  const targetDate = normalizeReminderDate(date) ?? normalizeReminderDate(new Date())
  const result = await pool.query(
    `
      SELECT ${milestoneColumns}
      FROM milestone_templates
      WHERE is_enabled = TRUE
        AND academic_year = EXTRACT(YEAR FROM $1::date)::INT
        AND (
          (first_reminder_date IS NOT NULL AND first_reminder_date <= $1::date)
          OR (second_reminder_date IS NOT NULL AND second_reminder_date <= $1::date)
          OR (deadline IS NOT NULL AND deadline <= $1::date)
        )
      ORDER BY degree_level, semester, sequence_order, created_at
    `,
    [targetDate],
  )

  const notifications = []
  let attemptedStages = 0

  for (const milestone of result.rows) {
    const dueStages = getDueReminderStages(milestone, targetDate)
    attemptedStages += dueStages.length

    for (const reminderStage of dueStages) {
      const notification = await createMilestoneReminderNotification(milestone, reminderStage)
      if (notification) notifications.push(notification)
    }
  }

  return {
    targetDate,
    milestonesFound: result.rows.length,
    attemptedStages,
    notifications,
    duplicatesSkipped: attemptedStages - notifications.length,
  }
}
