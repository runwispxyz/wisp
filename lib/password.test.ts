import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password.ts";

test("hash verifies only the same password", () => {
  const h = hashPassword("correct horse");
  assert.match(h, /^scrypt:[0-9a-f]{32}:[0-9a-f]{64}$/);
  assert.equal(verifyPassword("correct horse", h), true);
  assert.equal(verifyPassword("correct hors", h), false);
  assert.equal(verifyPassword("", h), false);
});

test("each hash gets its own salt", () => {
  assert.notEqual(hashPassword("x"), hashPassword("x"));
});

test("missing or malformed hash never verifies", () => {
  for (const bad of [undefined, "", "plain", "scrypt::", "bcrypt:aa:bb"]) assert.equal(verifyPassword("x", bad), false);
});
