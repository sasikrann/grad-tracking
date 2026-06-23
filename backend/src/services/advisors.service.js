import pool from '../config/database.js'

export async function findStudentsByAdvisorId(advisorId) {
  const result = await pool.query(
    `
      SELECT
        student_id AS "studentId",
        full_name AS "fullName",
        program,
        degree_level AS "degreeLevel",
        semester,
        expected_graduation_year AS "expectedGraduationYear",
        advisor_id AS "advisorId"
      FROM students
      WHERE advisor_id = $1
      ORDER BY student_id
    `,
    [advisorId],
  )

  return result.rows
}
