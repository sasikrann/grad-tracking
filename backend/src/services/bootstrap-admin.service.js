import { randomUUID } from "node:crypto";

const organizationEmailPattern = /^[^\s@]+@lamduan\.mfu\.ac\.th$/i;
const bootstrapLockName = "grad-tracking-bootstrap-admin";

export function bootstrapAdminConfig(environment = process.env) {
  const email = String(environment.BOOTSTRAP_ADMIN_EMAIL ?? "")
    .trim()
    .toLowerCase();
  const fullName = String(environment.BOOTSTRAP_ADMIN_NAME ?? "").trim() || "System Administrator";

  if (!email) throw new Error("BOOTSTRAP_ADMIN_EMAIL is required");
  if (!organizationEmailPattern.test(email)) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL must be a @lamduan.mfu.ac.th address");
  }

  return { email, fullName };
}

export async function upsertBootstrapAdmin(client, admin, createId = randomUUID) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [bootstrapLockName]);

  const existing = await client.query(
    `SELECT user_id
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1
     FOR UPDATE`,
    [admin.email],
  );

  if (existing.rowCount) {
    await client.query(
      `UPDATE users
       SET email = $2, full_name = $3, role = 'admin'
       WHERE user_id = $1`,
      [existing.rows[0].user_id, admin.email, admin.fullName],
    );
    return { created: false };
  }

  await client.query(
    `INSERT INTO users (user_id, email, full_name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       role = 'admin'`,
    [createId(), admin.email, admin.fullName],
  );
  return { created: true };
}

export async function bootstrapAdmin(pool, environment = process.env, createId = randomUUID) {
  const admin = bootstrapAdminConfig(environment);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await upsertBootstrapAdmin(client, admin, createId);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function waitForDatabase(
  pool,
  { attempts = 30, delayMs = 1000, onRetry = () => {} } = {},
) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        onRetry(attempt, attempts);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Database was not ready after ${attempts} attempts`, { cause: lastError });
}
