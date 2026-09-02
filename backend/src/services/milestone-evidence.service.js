import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'
import { ensureMilestoneSchema } from './milestones.service.js'

const maxRejectedRevisionRounds = 3

export async function submitStudentMilestoneEvidence(userId, milestoneId, evidenceUrl) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      WITH previous_evidence AS (
        SELECT sm.evidence_url
        FROM students s
        JOIN student_milestones sm ON sm.student_id = s.student_id
        WHERE s.user_id = $1
          AND sm.milestone_id = $2
      ),
      updated_milestone AS (
        INSERT INTO student_milestones (
          student_milestone_id, student_id, milestone_id, status, evidence_url, submitted_at, updated_at
        )
        SELECT
          $4,
          s.student_id,
          mt.milestone_id,
          'Completed',
          $3,
          NOW(),
          NOW()
        FROM students s
        JOIN milestone_templates mt
          ON mt.milestone_id = $2
          AND mt.academic_year = s.enrollment_academic_year
          AND (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
          AND (mt.plans @> ARRAY['All']::VARCHAR[] OR s.education_plan IS NULL OR s.education_plan = ANY(mt.plans))
          AND mt.is_enabled = TRUE
          AND (mt.semester = 'all' OR mt.semester::int <= s.semester::int)
          AND (mt.open_date IS NULL OR mt.open_date <= CURRENT_DATE)
        LEFT JOIN student_milestones existing_sm
          ON existing_sm.student_id = s.student_id
          AND existing_sm.milestone_id = mt.milestone_id
        WHERE s.user_id = $1
          AND COALESCE(existing_sm.rejection_count, 0) < ${maxRejectedRevisionRounds}
        ON CONFLICT (student_id, milestone_id) DO UPDATE SET
          status = 'Completed'::milestone_status,
          evidence_url = EXCLUDED.evidence_url,
          advisor_comment = NULL,
          submitted_at = NOW(),
          reviewed_at = NULL,
          reviewed_by = NULL,
          updated_at = NOW()
        RETURNING milestone_id
      )
      SELECT
        updated_milestone.milestone_id AS "milestoneId",
        previous_evidence.evidence_url AS "previousEvidenceUrl"
      FROM updated_milestone
      LEFT JOIN previous_evidence ON TRUE
    `,
    [userId, milestoneId, evidenceUrl, randomUUID()],
  )

  return result.rows[0] || null
}

export async function findStudentMilestoneEvidenceFileDetails(userId, milestoneId) {
  await ensureMilestoneSchema()
  const result = await pool.query(
    `
      SELECT s.student_id AS "studentId", mt.evidence_code AS "evidenceCode"
      FROM students s
      JOIN milestone_templates mt
        ON mt.milestone_id = $2
        AND mt.academic_year = s.enrollment_academic_year
        AND (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
        AND (mt.plans @> ARRAY['All']::VARCHAR[] OR s.education_plan IS NULL OR s.education_plan = ANY(mt.plans))
      WHERE s.user_id = $1
      LIMIT 1
    `,
    [userId, milestoneId],
  )
  return result.rows[0] || null
}

export async function hasReachedRejectedRevisionLimit(userId, milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT 1
      FROM students s
      JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = $2
      WHERE s.user_id = $1
        AND sm.rejection_count >= ${maxRejectedRevisionRounds}
    `,
    [userId, milestoneId],
  )

  return result.rowCount > 0
}

export async function clearStudentMilestoneEvidence(userId, milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      UPDATE student_milestones sm
      SET
        status = 'In Progress',
        evidence_url = NULL,
        advisor_comment = NULL,
        submitted_at = NULL,
        reviewed_at = NULL,
        reviewed_by = NULL,
        updated_at = NOW()
      FROM students s
      WHERE sm.student_id = s.student_id
        AND s.user_id = $1
        AND sm.milestone_id = $2
        AND sm.status <> 'Approved'
      RETURNING sm.milestone_id
    `,
    [userId, milestoneId],
  )

  return result.rowCount > 0
}


