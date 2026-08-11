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

  await client.query("COMMIT");

  console.info("Development admin is ready:");
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
