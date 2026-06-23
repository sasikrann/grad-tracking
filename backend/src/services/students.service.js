import pool from '../config/database.js'

async function findStudents({ advisorId } = {}) {
  const values = advisorId ? [advisorId] : []
  const advisorFilter = advisorId ? 'WHERE s.advisor_id = $1' : ''

  const result = await pool.query(
    `
      SELECT
        s.student_id AS "studentId",
        s.full_name AS "fullName",
        s.program,
        s.degree_level AS "degreeLevel",
        s.semester,
        s.expected_graduation_year AS "expectedGraduationYear",
        s.advisor_id AS "advisorId",
        a.full_name AS "advisorName",
        COALESCE(
          ROUND(
            100.0 * COUNT(sm.student_milestone_id)
              FILTER (WHERE sm.status IN ('Completed', 'Approved'))
            / NULLIF(COUNT(mt.milestone_id), 0)
          ),
          0
        )::INT AS progress,
        CASE
          WHEN COUNT(mt.milestone_id) FILTER (
            WHERE mt.deadline < CURRENT_DATE
              AND COALESCE(sm.status, 'Missing') NOT IN ('Completed', 'Approved')
          ) > 0 THEN 'Overdue'
          ELSE 'On-track'
        END AS status
      FROM students s
      LEFT JOIN advisors a ON a.advisor_id = s.advisor_id
      LEFT JOIN milestone_templates mt
        ON mt.degree_level = s.degree_level
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      ${advisorFilter}
      GROUP BY
        s.student_id,
        s.full_name,
        s.program,
        s.degree_level,
        s.semester,
        s.expected_graduation_year,
        s.advisor_id,
        a.full_name
      ORDER BY s.student_id
    `,
    values,
  )

  return result.rows
}

export function findAllStudents() {
  return findStudents()
}

export function findStudentsByAdvisorId(advisorId) {
  return findStudents({ advisorId })
}
