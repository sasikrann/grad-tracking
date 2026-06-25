import pool from '../config/database.js'
import { ApiError } from '../errors/api-error.js'

const eligibleMilestonesCte = `
  WITH filtered_students AS (
    SELECT
      s.student_id,
      s.degree_level
    FROM students s
    WHERE s.advisor_id = $1
      AND ($2::varchar IS NULL OR s.semester = $2)
      AND ($3::int IS NULL OR s.expected_graduation_year = $3)
  ),
  eligible_milestones AS (
    SELECT
      mt.milestone_id,
      mt.title,
      mt.sequence_order,
      fs.student_id,
      COALESCE(sm.status, 'Missing'::milestone_status) AS status
    FROM filtered_students fs
    JOIN milestone_templates mt
      ON mt.degree_level = fs.degree_level
      AND mt.is_enabled = TRUE
    LEFT JOIN student_milestones sm
      ON sm.student_id = fs.student_id
      AND sm.milestone_id = mt.milestone_id
  )
`

export async function findAdvisorMilestoneSummary({ advisorId, semester = null, year = null }) {
  const advisorResult = await pool.query('SELECT advisor_id FROM advisors WHERE advisor_id = $1', [
    advisorId,
  ])

  if (advisorResult.rowCount === 0) {
    throw new ApiError(404, `Advisor ${advisorId} not found`)
  }

  const values = [advisorId, semester, year]
  const [statisticsResult, milestonesResult] = await Promise.all([
    pool.query(
      `
        ${eligibleMilestonesCte}
        SELECT
          COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'In Progress')::int AS "inProgress",
          COUNT(*) FILTER (WHERE status = 'Approved')::int AS approved,
          COUNT(*) FILTER (WHERE status = 'Missing')::int AS missing,
          COUNT(*)::int AS total,
          COALESCE(
            ROUND(
              100.0 * COUNT(*) FILTER (WHERE status IN ('Completed', 'Approved'))
                / NULLIF(COUNT(*), 0)
            ),
            0
          )::int AS "overallProgress"
        FROM eligible_milestones
      `,
      values,
    ),
    pool.query(
      `
        ${eligibleMilestonesCte}
        SELECT
          milestone_id AS id,
          title AS name,
          COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'In Progress')::int AS "inProgress",
          COUNT(*) FILTER (WHERE status = 'Approved')::int AS approved,
          COUNT(*) FILTER (WHERE status = 'Missing')::int AS missing,
          COUNT(DISTINCT student_id)::int AS total
        FROM eligible_milestones
        GROUP BY milestone_id, title, sequence_order
        ORDER BY sequence_order, title
      `,
      values,
    ),
  ])

  return {
    statistics: statisticsResult.rows[0],
    milestones: milestonesResult.rows,
    filters: {
      semester: semester ?? 'all',
      year: year ?? 'all',
    },
  }
}
