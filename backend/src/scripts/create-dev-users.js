import pool from "../config/database.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("Development users cannot be created in production");
}

const users = {
  admin: {
    userId: "10000000-0000-4000-8000-000000000001",
    email: "6631501108@lamduan.mfu.ac.th",
    fullName: "Admin User",
    role: "admin",
  },
  advisor: {
    userId: "10000000-0000-4000-8000-000000000002",
    email: "6631501107@lamduan.mfu.ac.th",
    fullName: "Advisor User",
    role: "advisor",
  },
  student: {
    userId: "10000000-0000-4000-8000-000000000003",
    email: "6631501114@lamduan.mfu.ac.th",
    fullName: "Student User",
    role: "student",
  },
};

const client = await pool.connect();

try {
  await client.query("BEGIN");

  for (const [key, user] of Object.entries(users)) {
    const existingUser = await client.query(
      `
        SELECT user_id
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [user.email],
    );

    if (existingUser.rows[0]) {
      users[key].userId = existingUser.rows[0].user_id;
      await client.query(
        `
          UPDATE users
          SET role = $2
          WHERE user_id = $1
        `,
        [users[key].userId, user.role],
      );
    } else {
      const reusableDevelopmentUser = await client.query(
        "SELECT user_id FROM users WHERE user_id = $1",
        [user.userId],
      );

      if (reusableDevelopmentUser.rows[0]) {
        await client.query(
          `
            UPDATE users
            SET email = $2, full_name = $3, role = $4
            WHERE user_id = $1
          `,
          [user.userId, user.email, user.fullName, user.role],
        );
      } else {
        await client.query(
          `
            INSERT INTO users (user_id, email, full_name, role)
            VALUES ($1, $2, $3, $4)
          `,
          [user.userId, user.email, user.fullName, user.role],
        );
      }
    }
  }

  // สร้างหรืออัปเดตข้อมูล advisor mock สำหรับ development
  const existingAdvisor = await client.query(
    `
      SELECT advisor_id
      FROM advisors
      WHERE user_id = $1 OR LOWER(email) = LOWER($2)
      LIMIT 1
    `,
    [users.advisor.userId, users.advisor.email],
  );
  const advisorId = existingAdvisor.rows[0]?.advisor_id ?? "ADV001";

  if (existingAdvisor.rows[0]) {
    await client.query(
      `
        UPDATE advisors
        SET user_id = $2, email = $3
        WHERE advisor_id = $1
      `,
      [advisorId, users.advisor.userId, users.advisor.email],
    );
  } else {
    await client.query(
      `
        INSERT INTO advisors (advisor_id, user_id, full_name, email)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (advisor_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email
      `,
      [advisorId, users.advisor.userId, users.advisor.fullName, users.advisor.email],
    );
  }

  // จัดการข้อมูลของนักศึกษา โดยใช้ user_id ที่ได้จากการสร้างผู้ใช้
  const existingStudent = await client.query(
    "SELECT student_id FROM students WHERE user_id = $1 LIMIT 1",
    [users.student.userId],
  );
  const studentId = "6631501108";
  const legacyStudentId = existingStudent.rows[0]?.student_id;

  if (legacyStudentId && legacyStudentId !== studentId) {
    const conflictingStudent = await client.query(
      "SELECT user_id FROM students WHERE student_id = $1",
      [studentId],
    );
    if (conflictingStudent.rowCount) {
      throw new Error(`Cannot migrate development student: ${studentId} already exists`);
    }

    await client.query("UPDATE students SET user_id = NULL WHERE student_id = $1", [
      legacyStudentId,
    ]);
  }

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
      VALUES ($1, $2, $3, 'CE', 'Doctoral', 2026, '1', 2030, $4)
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
    [studentId, users.student.userId, users.student.fullName, advisorId],
  );

  if (legacyStudentId && legacyStudentId !== studentId) {
    await client.query("UPDATE student_milestones SET student_id = $1 WHERE student_id = $2", [
      studentId,
      legacyStudentId,
    ]);
    await client.query("DELETE FROM students WHERE student_id = $1", [legacyStudentId]);
  }

  await client.query("COMMIT");

  console.info("Development users are ready:");
  // Log a compact summary for local development. Avoid dumping large tables in production logs.
  console.info(
    JSON.stringify(
      Object.values(users).map(({ email, fullName, role }) => ({ role, fullName, email })),
    ),
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
