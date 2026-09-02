import pool from '../config/database.js'
import { ensureMilestoneSchema } from './milestones.service.js'

const maxRejectedRevisionRounds = 3

export async function findAdvisorStudentMilestones(advisorUserId, studentId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT
        s.student_id AS "studentId",
        s.full_name AS "studentName",
        s.graduation_semester AS "graduationSemester",
        s.graduation_academic_year AS "graduationAcademicYear",
        (s.advisor_id = a.advisor_id) AS "canReview",
        mt.milestone_id AS "milestoneId",
        mt.default_template_key AS "templateKey",
        mt.degree_level AS "degreeLevel",
        mt.semester,
        mt.plans,
        mt.prerequisite_milestone_ids AS "prerequisiteMilestoneIds",
        mt.title,
        mt.description,
        mt.reference_urls AS references,
        mt.sequence_order AS "sequenceOrder",
        mt.open_date AS "openDate",
        mt.deadline,
        mt.first_reminder_date AS "firstReminderDate",
        mt.second_reminder_date AS "secondReminderDate",
        CASE
          WHEN s.student_status = 'Graduate' THEN 'Approved'::milestone_status
          ELSE COALESCE(
            sm.status,
            CASE
              WHEN mt.deadline < CURRENT_DATE THEN 'Missing'::milestone_status
              ELSE 'In Progress'::milestone_status
            END
          )
        END AS status,
        sm.evidence_url AS "evidenceUrl",
        sm.advisor_comment AS "advisorComment",
        COALESCE(sm.rejection_count, 0) AS "rejectionCount",
        ${maxRejectedRevisionRounds} AS "maxRejectedRevisionRounds",
        sm.submitted_at AS "submittedAt",
        sm.reviewed_at AS "reviewedAt"
      FROM advisors a
      JOIN students s
        ON s.student_id = $2
      LEFT JOIN milestone_templates mt
        ON (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
        AND mt.academic_year = s.enrollment_academic_year
        AND (mt.plans @> ARRAY['All']::VARCHAR[] OR s.education_plan IS NULL OR s.education_plan = ANY(mt.plans))
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      WHERE a.user_id = $1
        AND (
          s.advisor_id = a.advisor_id
          OR EXISTS (
            SELECT 1
            FROM student_co_advisors sca
            WHERE sca.student_id = s.student_id
              AND sca.advisor_id = a.advisor_id
          )
        )
      ORDER BY CASE WHEN mt.semester = 'all' THEN 0 ELSE mt.semester::int END, mt.sequence_order, mt.created_at
    `,
    [advisorUserId, studentId],
  )

  if (!result.rows.length) return null

  return {
    canReview: result.rows[0].canReview,
    student: {
      studentId: result.rows[0].studentId,
      studentName: result.rows[0].studentName,
      graduationSemester: result.rows[0].graduationSemester,
      graduationAcademicYear: result.rows[0].graduationAcademicYear,
    },
    milestones: result.rows
      .filter((row) => row.milestoneId)
      .map(
        ({
          studentId: _studentId,
          studentName: _studentName,
          graduationSemester: _graduationSemester,
          graduationAcademicYear: _graduationAcademicYear,
          canReview: _canReview,
          ...milestone
        }) => milestone,
      ),
  }
}

export async function reviewStudentMilestone({
  reviewerUserId,
  studentId,
  milestoneId,
  status,
  advisorComment,
}) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      UPDATE student_milestones sm
      SET
        status = $4::milestone_status,
        advisor_comment = $5,
        rejection_count = CASE
          WHEN $4 = 'In Progress' THEN LEAST(sm.rejection_count + 1, ${maxRejectedRevisionRounds})
          ELSE sm.rejection_count
        END,
        evidence_url = CASE WHEN $4 = 'In Progress' THEN NULL ELSE sm.evidence_url END,
        submitted_at = CASE WHEN $4 = 'In Progress' THEN NULL ELSE sm.submitted_at END,
        reviewed_at = NOW(),
        reviewed_by = a.advisor_id,
        updated_at = NOW()
      FROM students s
      JOIN advisors a ON a.advisor_id = s.advisor_id
      WHERE sm.student_id = s.student_id
        AND s.student_id = $1
        AND sm.milestone_id = $2
        AND a.user_id = $3
        AND sm.evidence_url IS NOT NULL
      RETURNING sm.student_milestone_id
    `,
    [studentId, milestoneId, reviewerUserId, status, advisorComment],
  )

  return result.rowCount > 0
}

export async function findAdvisorMilestoneSubmissions(advisorUserId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT
        s.student_id AS "studentId",
        s.full_name AS "studentName",
        mt.milestone_id AS "milestoneId",
        mt.title,
        mt.description,
        mt.deadline,
        sm.status,
        sm.evidence_url AS "evidenceUrl",
        sm.advisor_comment AS "advisorComment",
        COALESCE(sm.rejection_count, 0) AS "rejectionCount",
        ${maxRejectedRevisionRounds} AS "maxRejectedRevisionRounds",
        sm.submitted_at AS "submittedAt",
        sm.reviewed_at AS "reviewedAt"
      FROM advisors a
      JOIN students s ON s.advisor_id = a.advisor_id
      JOIN student_milestones sm ON sm.student_id = s.student_id
      JOIN milestone_templates mt ON mt.milestone_id = sm.milestone_id
      WHERE a.user_id = $1
        AND sm.evidence_url IS NOT NULL
      ORDER BY sm.submitted_at DESC NULLS LAST, mt.deadline, s.student_id
    `,
    [advisorUserId],
  )

  return result.rows
}


