import pool from '../config/database.js'

function localizeUserName(user) {
  if (!user || !['advisor', 'student'].includes(user.role)) return user

  const primaryName = String(user.fullName ?? '').trim()
  const alternateName = String(user.fullNameThai ?? '').trim()
  const primaryIsThai = /[\u0E00-\u0E7F]/.test(primaryName)
  const alternateIsThai = /[\u0E00-\u0E7F]/.test(alternateName)

  // Some legacy rows stored the Thai and English advisor names in opposite columns.
  const fullNameEnglish = primaryIsThai && alternateName && !alternateIsThai
    ? alternateName
    : primaryName
  const fullNameThai = !primaryIsThai && alternateIsThai
    ? alternateName
    : primaryIsThai
      ? primaryName
      : alternateName

  return {
    ...user,
    fullName: fullNameEnglish || fullNameThai,
    fullNameEnglish: fullNameEnglish || null,
    fullNameThai: fullNameThai || null,
  }
}

export async function findAuthorizedUserByEmail(email) {
  const result = await pool.query(
    `
      SELECT
        u.user_id AS "userId",
        u.email,
        CASE
          WHEN u.role = 'advisor' THEN a.full_name
          WHEN u.role = 'student' THEN s.full_name
          ELSE u.full_name
        END AS "fullName",
        CASE
          WHEN u.role = 'advisor' THEN a.full_name_thai
          WHEN u.role = 'student' THEN to_jsonb(s) ->> 'full_name_thai'
        END AS "fullNameThai",
        u.role,
        a.advisor_id AS "advisorId"
      FROM users u
      LEFT JOIN advisors a ON a.user_id = u.user_id
      LEFT JOIN students s ON s.user_id = u.user_id
      WHERE LOWER(u.email) = LOWER($1)
        AND (u.role <> 'advisor' OR a.status = 'active')
      LIMIT 1
    `,
    [email],
  )

  return localizeUserName(result.rows[0] || null)
}

export async function findAuthorizedUserById(userId) {
  const result = await pool.query(
    `
      SELECT
        u.user_id AS "userId",
        u.email,
        CASE
          WHEN u.role = 'advisor' THEN a.full_name
          WHEN u.role = 'student' THEN s.full_name
          ELSE u.full_name
        END AS "fullName",
        CASE
          WHEN u.role = 'advisor' THEN a.full_name_thai
          WHEN u.role = 'student' THEN to_jsonb(s) ->> 'full_name_thai'
        END AS "fullNameThai",
        u.role,
        a.advisor_id AS "advisorId"
      FROM users u
      LEFT JOIN advisors a ON a.user_id = u.user_id
      LEFT JOIN students s ON s.user_id = u.user_id
      WHERE u.user_id = $1
        AND (u.role <> 'advisor' OR a.status = 'active')
      LIMIT 1
    `,
    [userId],
  )

  return localizeUserName(result.rows[0] || null)
}

export async function findAdvisorIdByUserId(userId) {
  const result = await pool.query(
    'SELECT advisor_id AS "advisorId" FROM advisors WHERE user_id = $1',
    [userId],
  )

  return result.rows[0]?.advisorId ?? null
}
