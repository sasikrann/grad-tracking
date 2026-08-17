import pool from '../config/database.js'

export function canAccessEvidence(user, evidence) {
  if (user.role === 'admin') return true
  if (user.role === 'student') return evidence.studentUserId === user.userId
  if (user.role === 'advisor') {
    return (
      evidence.primaryAdvisorUserId === user.userId ||
      evidence.coAdvisorUserIds.includes(user.userId)
    )
  }
  return false
}

export async function findEvidenceByUrl(evidenceUrl) {
  const result = await pool.query(
    `
      SELECT
        sm.evidence_url AS "evidenceUrl",
        s.user_id AS "studentUserId",
        primary_advisor.user_id AS "primaryAdvisorUserId",
        ARRAY(
          SELECT co_advisor.user_id
          FROM student_co_advisors sca
          JOIN advisors co_advisor ON co_advisor.advisor_id = sca.advisor_id
          WHERE sca.student_id = s.student_id
        ) AS "coAdvisorUserIds"
      FROM student_milestones sm
      JOIN students s ON s.student_id = sm.student_id
      LEFT JOIN advisors primary_advisor ON primary_advisor.advisor_id = s.advisor_id
      WHERE sm.evidence_url = $1
      LIMIT 1
    `,
    [evidenceUrl],
  )
  return result.rows[0] || null
}
