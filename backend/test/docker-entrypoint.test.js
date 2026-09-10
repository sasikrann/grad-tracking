import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("runs bootstrap before starting the backend and stops on bootstrap failure", async () => {
  const entrypoint = await readFile(new URL("../docker-entrypoint.sh", import.meta.url), "utf8");
  const bootstrapPosition = entrypoint.indexOf("node src/scripts/bootstrap-admin.js");
  const backendPosition = entrypoint.indexOf('exec "$@"');

  assert.match(entrypoint, /set -eu/);
  assert.ok(bootstrapPosition >= 0);
  assert.ok(backendPosition > bootstrapPosition);
});
