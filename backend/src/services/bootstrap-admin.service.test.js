import assert from "node:assert/strict";
import test from "node:test";

import {
  bootstrapAdmin,
  bootstrapAdminConfig,
  waitForDatabase,
} from "./bootstrap-admin.service.js";

function createFakePool(initialUsers = [], { failInsert = false } = {}) {
  const users = initialUsers.map((user) => ({ ...user }));
  const statements = [];
  let released = false;

  const client = {
    async query(sql, values = []) {
      const statement = String(sql).replace(/\s+/g, " ").trim();
      statements.push(statement);

      if (statement.startsWith("SELECT user_id FROM users")) {
        const email = String(values[0]).toLowerCase();
        const user = users.find((item) => item.email.toLowerCase() === email);
        return { rowCount: user ? 1 : 0, rows: user ? [{ user_id: user.userId }] : [] };
      }

      if (statement.startsWith("UPDATE users")) {
        const user = users.find((item) => item.userId === values[0]);
        user.email = values[1];
        user.fullName = values[2];
        user.role = "admin";
        return { rowCount: 1, rows: [] };
      }

      if (statement.startsWith("INSERT INTO users")) {
        if (failInsert) throw new Error("Insert failed");
        const existing = users.find((item) => item.email === values[1]);
        if (existing) {
          existing.fullName = values[2];
          existing.role = "admin";
        } else {
          users.push({ userId: values[0], email: values[1], fullName: values[2], role: "admin" });
        }
        return { rowCount: 1, rows: [] };
      }

      return { rowCount: 0, rows: [] };
    },
    release() {
      released = true;
    },
  };

  return {
    users,
    statements,
    get released() {
      return released;
    },
    async connect() {
      return client;
    },
  };
}

const environment = {
  BOOTSTRAP_ADMIN_EMAIL: "admin@lamduan.mfu.ac.th",
  BOOTSTRAP_ADMIN_NAME: "System Administrator",
};

test("requires a bootstrap administrator email", () => {
  assert.throws(() => bootstrapAdminConfig({}), /BOOTSTRAP_ADMIN_EMAIL is required/);
});

test("rejects a bootstrap administrator outside the organization domain", () => {
  assert.throws(
    () => bootstrapAdminConfig({ BOOTSTRAP_ADMIN_EMAIL: "admin@example.com" }),
    /must be a @lamduan\.mfu\.ac\.th address/,
  );
});

test("creates an administrator when the configured account does not exist", async () => {
  const pool = createFakePool();
  const result = await bootstrapAdmin(pool, environment, () => "new-user-id");

  assert.deepEqual(result, { created: true });
  assert.deepEqual(pool.users, [
    {
      userId: "new-user-id",
      email: environment.BOOTSTRAP_ADMIN_EMAIL,
      fullName: environment.BOOTSTRAP_ADMIN_NAME,
      role: "admin",
    },
  ]);
  assert.equal(pool.released, true);
  assert.ok(pool.statements.includes("COMMIT"));
});

test("updates an existing account to admin without creating a duplicate", async () => {
  const pool = createFakePool([
    {
      userId: "existing-user-id",
      email: "ADMIN@lamduan.mfu.ac.th",
      fullName: "Existing User",
      role: "student",
    },
  ]);

  const result = await bootstrapAdmin(pool, environment, () => "unused-user-id");

  assert.deepEqual(result, { created: false });
  assert.equal(pool.users.length, 1);
  assert.deepEqual(pool.users[0], {
    userId: "existing-user-id",
    email: environment.BOOTSTRAP_ADMIN_EMAIL,
    fullName: environment.BOOTSTRAP_ADMIN_NAME,
    role: "admin",
  });
});

test("remains idempotent when bootstrap runs repeatedly", async () => {
  const pool = createFakePool();

  await bootstrapAdmin(pool, environment, () => "new-user-id");
  await bootstrapAdmin(pool, environment, () => "another-user-id");

  assert.equal(pool.users.length, 1);
  assert.equal(pool.users[0].userId, "new-user-id");
});

test("rolls back and releases the database client when bootstrap fails", async () => {
  const pool = createFakePool([], { failInsert: true });

  await assert.rejects(() => bootstrapAdmin(pool, environment), /Insert failed/);
  assert.ok(pool.statements.includes("ROLLBACK"));
  assert.equal(pool.released, true);
});

test("waits until the database accepts a connection", async () => {
  let calls = 0;
  const pool = {
    async query() {
      calls += 1;
      if (calls < 3) throw new Error("Not ready");
    },
  };

  await waitForDatabase(pool, { attempts: 3, delayMs: 0 });
  assert.equal(calls, 3);
});

test("fails after the configured database readiness attempts", async () => {
  const pool = {
    async query() {
      throw new Error("Not ready");
    },
  };

  await assert.rejects(
    () => waitForDatabase(pool, { attempts: 2, delayMs: 0 }),
    /Database was not ready after 2 attempts/,
  );
});
