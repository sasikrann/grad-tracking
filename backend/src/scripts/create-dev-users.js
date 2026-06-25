import pool from '../config/database.js'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Development users cannot be created in production')
}

const users = {
  admin: {
    userId: '10000000-0000-4000-8000-000000000001',
    email: 'admin.dev@lamduan.mfu.ac.th',
    fullName: 'Development Admin',
    role: 'admin',
  },
  advisor: {
    userId: '10000000-0000-4000-8000-000000000002',
    email: 'advisor.dev@lamduan.mfu.ac.th',
    fullName: 'Development Advisor',
    role: 'advisor',
  },
  student: {
    userId: '10000000-0000-4000-8000-000000000003',
    email: 'student.dev@lamduan.mfu.ac.th',
    fullName: 'Development Student',
    role: 'student',
  },
}

const client = await pool.connect()

try {
  await client.query('BEGIN')

  for (const [key, user] of Object.entries(users)) {
    const result = await client.query(
      `
        INSERT INTO users (user_id, email, full_name, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role
        RETURNING user_id
      `,
      [user.userId, user.email, user.fullName, user.role],
    )
    users[key].userId = result.rows[0].user_id
  }

  // สร้างหรืออัปเดตข้อมูล advisor mock สำหรับ development
  await client.query(
    `
      INSERT INTO advisors (advisor_id, user_id, full_name, email)
      VALUES ('DEV-ADV-001', $1, $2, $3)
      ON CONFLICT (advisor_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email
    `,
    [users.advisor.userId, users.advisor.fullName, users.advisor.email],
  )

  // จัดการข้อมูลของนักศึกษา โดยใช้ user_id ที่ได้จากการสร้างผู้ใช้
  await client.query(
    `
      INSERT INTO students (
        student_id,
        user_id,
        full_name,
        program,
        degree_level,
        enrollment_academic_year,
        semester,
        expected_graduation_year,
        advisor_id
      )
      VALUES ('DEV-STU-001', $1, $2, 'CE', 'Doctoral', 2026, '1', 2030, 'DEV-ADV-001')
      ON CONFLICT (student_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        full_name = EXCLUDED.full_name,
        program = EXCLUDED.program,
        degree_level = EXCLUDED.degree_level,
        enrollment_academic_year = EXCLUDED.enrollment_academic_year,
        semester = EXCLUDED.semester,
        expected_graduation_year = EXCLUDED.expected_graduation_year,
        advisor_id = EXCLUDED.advisor_id,
        updated_at = NOW()
    `,
    [users.student.userId, users.student.fullName],
  )

  await client.query('COMMIT')

  console.log('Development users are ready:')
  console.table(
    Object.values(users).map(({ email, fullName, role }) => ({ role, fullName, email })),
  )
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
