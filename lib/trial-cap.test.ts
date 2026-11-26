import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { DAILY_SCHEMA, takeDailyMedia, dailyMediaLeft } from "./trial-cap.ts";

test("free images stop at the daily cap and come back the next UTC day", () => {
  const d = new DatabaseSync(":memory:");
  d.exec(DAILY_SCHEMA);
  for (let i = 0; i < 3; i++) assert.equal(takeDailyMedia(d, "2026-11-27", 3), true);
  assert.equal(takeDailyMedia(d, "2026-11-27", 3), false);
  assert.equal(dailyMediaLeft(d, "2026-11-27", 3), 0);
  assert.equal(dailyMediaLeft(d, "2026-11-28", 3), 3);
  assert.equal(takeDailyMedia(d, "2026-11-28", 3), true);
});
