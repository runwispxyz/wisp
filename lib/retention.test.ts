import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// db.ts opens <cwd>/data/wisp.db, so move to a temp folder before loading it: never touch the real database
process.chdir(mkdtempSync(path.join(tmpdir(), "wisp-retention-")));
const { db, purgeOldCalls, CALL_RETENTION_DAYS } = await import("./db.ts");

test("billing rows older than the retention window are deleted, open holds and recent rows are kept", () => {
  const day = 86400_000, t = Date.now();
  const add = (status: string, ageDays: number) =>
    db.prepare("insert into calls (account_id, model, kind, status, source, created) values (1, 'm', 'chat', ?, 'api', ?)").run(status, t - ageDays * day);
  add("settled", CALL_RETENTION_DAYS + 1); // old: goes
  add("failed", CALL_RETENTION_DAYS + 5); // old: goes
  add("held", CALL_RETENTION_DAYS + 9); // old but still open: stays
  add("settled", CALL_RETENTION_DAYS - 1); // recent: stays

  assert.equal(purgeOldCalls(t), 2);
  const left = db.prepare("select status from calls order by created").all() as { status: string }[];
  assert.deepEqual(left.map((r) => r.status), ["held", "settled"]);
});
