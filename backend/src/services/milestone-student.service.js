import pool from '../config/database.js'
import { ensureMilestoneSchema } from './milestones.service.js'

const maxRejectedRevisionRounds = 3

export async function findStudentMilestonesByUserId(userId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT
        mt.milestone_id AS "milestoneId",
        mt.default_template_key AS "templateKey",
        mt.degree_level AS "degreeLevel",
        mt.semester,
        mt.plans,
        mt.prerequisite_milestone_ids AS "prerequisiteMilestoneIds",
        ARRAY(
          SELECT prerequisite_template.title
          FROM unnest(mt.prerequisite_milestone_ids) WITH ORDINALITY AS prerequisite(milestone_id, position)
          JOIN milestone_templates prerequisite_template
            ON prerequisite_template.milestone_id::text = prerequisite.milestone_id
          ORDER BY prerequisite.position
        ) AS "prerequisiteTitles",
        mt.title,
        mt.description,
        mt.reference_urls AS references,
        mt.sequence_order AS "sequenceOrder",
        mt.open_date AS "openDate",
        mt.deadline,
        mt.first_reminder_date AS "firstReminderDate",
        mt.second_reminder_date AS "secondReminderDate",
        (
          (mt.semester <> 'all' AND mt.semester::int > s.semester::int)
          OR mt.open_date > CURRENT_DATE
          OR EXISTS (
            SELECT 1
            FROM unnest(mt.prerequisite_milestone_ids) AS prerequisite(milestone_id)
            LEFT JOIN student_milestones prerequisite_status
              ON prerequisite_status.student_id = s.student_id
              AND prerequisite_status.milestone_id::text = prerequisite.milestone_id
              AND prerequisite_status.status IN ('Completed', 'Approved')
            WHERE prerequisite_status.student_milestone_id IS NULL
          )
        ) AS "isLocked",
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
      FROM students s
      JOIN milestone_templates mt
        ON (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
        AND mt.academic_year = s.enrollment_academic_year
        AND (mt.plans @> ARRAY['All']::VARCHAR[] OR s.education_plan IS NULL OR s.education_plan = ANY(mt.plans))
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      WHERE s.user_id = $1
      ORDER BY CASE WHEN mt.semester = 'all' THEN 0 ELSE mt.semester::int END, mt.sequence_order, mt.created_at
    `,
    [userId],
  )

  return result.rows
}

export async function studentMilestoneRequiresAdvisor(userId, milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT target.sequence_order > appointment.sequence_order AS "requiresAdvisor"
      FROM students s
      JOIN milestone_templates target
        ON target.milestone_id = $2
        AND target.academic_year = s.enrollment_academic_year
        AND target.degree_level = s.degree_level::text
        AND s.education_plan = ANY(target.plans)
      JOIN milestone_templates appointment
        ON appointment.academic_year = s.enrollment_academic_year
        AND appointment.degree_level = s.degree_level::text
        AND s.education_plan = ANY(appointment.plans)
        AND appointment.default_template_key LIKE '%advisor-appointment'
      WHERE s.user_id = $1
      LIMIT 1
    `,
    [userId, milestoneId],
  )

  return result.rows[0]?.requiresAdvisor ?? false
}

export async function areStudentMilestonePrerequisitesComplete(userId, milestoneId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT NOT EXISTS (
        SELECT 1
        FROM unnest(mt.prerequisite_milestone_ids) AS prerequisite(milestone_id)
        LEFT JOIN student_milestones prerequisite_status
          ON prerequisite_status.student_id = s.student_id
          AND prerequisite_status.milestone_id::text = prerequisite.milestone_id
          AND prerequisite_status.status IN ('Completed', 'Approved')
        WHERE prerequisite_status.student_milestone_id IS NULL
      ) AS complete
      FROM students s
      JOIN milestone_templates mt ON mt.milestone_id = $2
      WHERE s.user_id = $1
      LIMIT 1
    `,
    [userId, milestoneId],
  )

  return result.rows[0]?.complete ?? true
}

export async function findStudentMilestonesByStudentId(studentId) {
  await ensureMilestoneSchema()

  const result = await pool.query(
    `
      SELECT
        s.student_id AS "studentId",
        s.full_name AS "studentName",
        s.graduation_semester AS "graduationSemester",
        s.graduation_academic_year AS "graduationAcademicYear",
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
      FROM students s
      LEFT JOIN milestone_templates mt
        ON (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
        AND mt.academic_year = s.enrollment_academic_year
        AND (mt.plans @> ARRAY['All']::VARCHAR[] OR s.education_plan IS NULL OR s.education_plan = ANY(mt.plans))
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      WHERE s.student_id = $1
      ORDER BY CASE WHEN mt.semester = 'all' THEN 0 ELSE mt.semester::int END, mt.sequence_order, mt.created_at
    `,
    [studentId],
  )

  if (!result.rows.length) return null

  return {
    student: {
      studentId: result.rows[0].studentId,
      studentName: result.rows[0].studentName,
      graduationSemester: result.rows[0].graduationSemester,
      graduationAcademicYear: result.rows[0].graduationAcademicYear,
    },
    milestones: result.rows
      .filter((row) => row.milestoneId)
      .map(({
        studentId: _studentId,
        studentName: _studentName,
        graduationSemester: _graduationSemester,
        graduationAcademicYear: _graduationAcademicYear,
        ...milestone
      }) => milestone),
  }
}


