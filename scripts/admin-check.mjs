// Admin flow check against a running server. Password comes from the environment, never from this file:
//   $env:ADMIN_PW = "..."; node scripts/admin-check.mjs http://localhost:3000
import assert from "node:assert/strict";

const BASE = process.argv[2] || "http://localhost:3000";
const PW = process.env.ADMIN_PW;
assert.ok(PW, "set ADMIN_PW");
const CA = "0x1111111111111111111111111111111111111111";
let cookie = "";
const call = async (path, init = {}) => {
  const r = await fetch(BASE + path, { ...init, headers: { "Content-Type": "application/json", cookie, ...init.headers } });
  for (const c of r.headers.getSetCookie?.() || []) cookie = c.split(";")[0];
  return r;
};

const before = (await (await fetch(BASE + "/api/contract")).json()).contract;

// locked out without a session
assert.equal((await call("/api/admin/contract", { method: "PUT", body: JSON.stringify({ contract: CA }) })).status, 401);

// brute-force guard (forged client id so the real one is not locked)
const bf = { "x-forwarded-for": "203.0.113." + Math.floor(Math.random() * 250) };
for (let i = 0; i < 5; i++) assert.equal((await call("/api/admin/login", { method: "POST", headers: bf, body: JSON.stringify({ password: "wrong" + i }) })).status, 401);
assert.equal((await call("/api/admin/login", { method: "POST", headers: bf, body: JSON.stringify({ password: PW }) })).status, 429, "6th try should be blocked even with the right password");
cookie = "";

// real login
assert.equal((await call("/api/admin/login", { method: "POST", body: JSON.stringify({ password: PW }) })).status, 200);
assert.ok(cookie.startsWith("wisp_admin="));

// validation
assert.equal((await call("/api/admin/contract", { method: "PUT", body: JSON.stringify({ contract: "0x123" }) })).status, 400);
assert.equal((await call("/api/admin/contract", { method: "PUT", body: JSON.stringify({ contract: "hello" }) })).status, 400);

// save shows everywhere
const saved = await (await call("/api/admin/contract", { method: "PUT", body: JSON.stringify({ contract: CA }) })).json();
assert.equal(saved.contract, CA);
assert.equal((await (await fetch(BASE + "/api/contract")).json()).contract, CA);
const home = await (await fetch(BASE + "/")).text();
assert.ok(home.split(CA).length - 1 >= 2, "CA should appear in the hero and the token block");
assert.ok((await (await fetch(BASE + "/token")).text()).includes(CA));

// restore what was there, then sign out
await call("/api/admin/contract", { method: "PUT", body: JSON.stringify({ contract: before ?? "" }) });
assert.equal((await (await fetch(BASE + "/api/contract")).json()).contract, before);
assert.equal((await call("/api/admin/logout", { method: "POST" })).status, 200);
assert.equal((await call("/api/admin/contract")).status, 401);
console.log("ADMIN OK");
