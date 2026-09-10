import pool from "../config/database.js";
import { bootstrapAdmin, waitForDatabase } from "../services/bootstrap-admin.service.js";

try {
  await waitForDatabase(pool, {
    onRetry(attempt, attempts) {
      console.info(`Waiting for database (${attempt}/${attempts})`);
    },
  });
  const result = await bootstrapAdmin(pool);
  console.info(result.created ? "Bootstrap admin created" : "Bootstrap admin already exists");
} catch (error) {
  console.error(
    `Bootstrap admin failed: ${error instanceof Error ? error.message : "Unknown error"}`,
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
