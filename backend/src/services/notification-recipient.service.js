export async function findNotificationEmailRecipients(client, targetAudience) {
  const result = await client.query(
    `
      SELECT DISTINCT u.email
      FROM users u
      JOIN students s ON s.user_id = u.user_id
      WHERE u.role = 'student'
        AND u.email IS NOT NULL
        AND (
          $1 = 'All Students'
          OR ($1 = 'Master Students' AND s.degree_level = 'Master')
          OR ($1 = 'Doctoral Students' AND s.degree_level = 'Doctoral')
        )
      ORDER BY u.email
    `,
    [targetAudience],
  )

  return result.rows.map((row) => row.email)
}
