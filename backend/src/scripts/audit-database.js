import pool from '../config/database.js'

const checks = [
  {
    name: 'Milestone templates by academic year',
    query: `
      SELECT academic_year AS "academicYear", COUNT(*)::int AS "milestoneCount"
      FROM milestone_templates
      GROUP BY academic_year
      ORDER BY academic_year NULLS FIRST
    `,
  },
  {
    name: 'Students without milestone templates for their enrollment year',
    query: `
      SELECT COUNT(*)::int AS count
      FROM students student
      WHERE NOT EXISTS (
        SELECT 1
        FROM milestone_templates milestone
        WHERE milestone.academic_year = student.enrollment_academic_year
      )
    `,
    expectZero: true,
  },
  {
    name: 'Broken prerequisite milestone references',
    query: `
      SELECT COUNT(*)::int AS count
      FROM milestone_templates milestone
      CROSS JOIN LATERAL unnest(milestone.prerequisite_milestone_ids) prerequisite_id
      LEFT JOIN milestone_templates prerequisite
        ON prerequisite.milestone_id::text = prerequisite_id
      WHERE prerequisite.milestone_id IS NULL
    `,
    expectZero: true,
  },
  {
    name: 'Prerequisites referencing a different academic year',
    query: `
      SELECT COUNT(*)::int AS count
      FROM milestone_templates milestone
      CROSS JOIN LATERAL unnest(milestone.prerequisite_milestone_ids) prerequisite_id
      JOIN milestone_templates prerequisite
        ON prerequisite.milestone_id::text = prerequisite_id
      WHERE milestone.academic_year IS DISTINCT FROM prerequisite.academic_year
    `,
    expectZero: true,
  },
  {
    name: 'Orphan student milestone progress records',
    query: `
      SELECT COUNT(*)::int AS count
      FROM student_milestones progress
      LEFT JOIN students student ON student.student_id = progress.student_id
      LEFT JOIN milestone_templates milestone ON milestone.milestone_id = progress.milestone_id
      WHERE student.student_id IS NULL OR milestone.milestone_id IS NULL
    `,
    expectZero: true,
  },
]

let hasFailures = false

try {
  for (const check of checks) {
    const result = await pool.query(check.query)
    const count = result.rows[0]?.count
    const passed = !check.expectZero || count === 0
    hasFailures ||= !passed
    console.info(`${passed ? 'PASS' : 'FAIL'}: ${check.name}`)
    console.table(result.rows)
  }
} finally {
  await pool.end()
}

if (hasFailures) process.exitCode = 1
