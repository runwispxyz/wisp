// End-to-end check of the backend against a running server: node scripts/smoke.mjs [baseUrl]
import assert from "node:assert/strict";
import { createSiweMessage } from "viem/siwe";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const BASE = process.argv[2] || "http://localhost:3000";
const host = new URL(BASE).host;
let cookie = "";
const call = async (path, init = {}) => {
  const r = await fetch(BASE + path, { ...init, headers: { "Content-Type": "application/json", cookie, ...init.headers } });
  const set = r.headers.getSetCookie?.() || [];
  for (const c of set) cookie = [cookie, c.split(";")[0]].filter(Boolean).join("; ");
  return r;
};
const j = async (path, init) => {
  const r = await call(path, init);
  const body = await r.json();
  return { status: r.status, body };
};

// 1. sign in
const acct = privateKeyToAccount(generatePrivateKey());
const { body: n } = await j("/api/auth/nonce");
const message = createSiweMessage({ domain: host, address: acct.address, uri: BASE, version: "1", chainId: n.chainId, nonce: n.nonce });
const v = await j("/api/auth/verify", { method: "POST", body: JSON.stringify({ message, signature: await acct.signMessage({ message }) }) });
assert.equal(v.status, 200, JSON.stringify(v.body));
// replayed nonce must fail
const replay = await j("/api/auth/verify", { method: "POST", body: JSON.stringify({ message, signature: await acct.signMessage({ message }) }) });
assert.equal(replay.status, 401);
let me = (await j("/api/me")).body;
assert.equal(me.balance, 0);
console.log("signed in", me.address, "deposit", me.depositAddress);

// 2. no balance → 402
const broke = await j("/v1/chat/completions", { method: "POST", body: JSON.stringify({ model: "mistral-large-4", messages: [{ role: "user", content: "hi" }] }) });
assert.equal(broke.status, 402);

// 3. mock deposit + redeem
assert.equal((await j("/api/deposits/mock", { method: "POST", body: JSON.stringify({ token: "USDG", amount: 2 }) })).status, 200);
const red = await j("/api/redeem", { method: "POST", body: JSON.stringify({ code: "welcome5" }) });
assert.equal(red.status, 200);
assert.equal((await j("/api/redeem", { method: "POST", body: JSON.stringify({ code: "WELCOME5" }) })).status, 409);
me = (await j("/api/me")).body;
assert.equal(me.balance, 7);

// 4. key with a cap and a model list
const k = await j("/api/keys", { method: "POST", body: JSON.stringify({ name: "smoke", cap: 1, models: ["nemotron-3.5-lightning", "flux.1-schnell", "wisp-tone"] }) });
assert.equal(k.status, 201);
const auth = { authorization: `Bearer ${k.body.key}`, cookie: "" };
const denied = await fetch(BASE + "/v1/chat/completions", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ model: "mistral-large-4", messages: [{ role: "user", content: "hi" }] }) });
assert.equal(denied.status, 403);

// 5. streamed chat through the key
const s = await fetch(BASE + "/v1/chat/completions", {
  method: "POST", headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "nemotron-3.5-lightning", stream: true, max_tokens: 200, messages: [{ role: "user", content: "Reply with one short sentence about moths." }] }),
});
assert.equal(s.status, 200);
const text = await s.text();
const receipt = JSON.parse(text.match(/: receipt (.*)/)[1]);
assert.ok(receipt.charged > 0 && receipt.charged <= receipt.held, JSON.stringify(receipt));
assert.ok(!text.includes("nvidia/"), "upstream model id leaked");
console.log("chat receipt", receipt);

// 6. non-stream chat
const ns = await fetch(BASE + "/v1/chat/completions", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ model: "nemotron-3.5-lightning", max_tokens: 100, messages: [{ role: "user", content: "Say ok" }] }) });
assert.equal(ns.status, 200);
assert.ok(Number(ns.headers.get("x-wisp-charged")) > 0);

// 7. media jobs
for (const model of ["flux.1-schnell", "wisp-tone"]) {
  const job = await fetch(BASE + "/v1/jobs", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ model, prompt: "a lighthouse at dusk" }) }).then((r) => r.json());
  let st;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    st = await fetch(BASE + `/v1/jobs/${job.id}`, { headers: auth }).then((r) => r.json());
    if (st.status !== "running") break;
  }
  assert.equal(st.status, "succeeded", JSON.stringify(st));
  const file = await fetch(BASE + st.content_url, { headers: auth });
  assert.equal(file.status, 200);
  const size = (await file.arrayBuffer()).byteLength;
  assert.equal((await fetch(BASE + st.content_url, { headers: auth })).status, 404, "media should be gone after download");
  console.log(model, st.mime, size, "bytes, charged", st.charged);
}

// 8. books add up
const acts = (await j("/api/activity")).body.calls;
const spent = acts.filter((c) => c.status === "settled").reduce((s, c) => s + c.cost, 0);
me = (await j("/api/me")).body;
assert.ok(Math.abs(7 - spent - me.balance) < 1e-6, `balance ${me.balance} vs 7 - ${spent}`);
const keys = (await j("/api/keys")).body.keys;
assert.ok(Math.abs(keys[0].spent - spent) < 1e-6);
console.log("calls", acts.length, "spent", spent.toFixed(6), "balance", me.balance);

// 9. revoke
assert.equal((await j(`/api/keys/${keys[0].id}`, { method: "DELETE" })).status, 200);
assert.equal((await fetch(BASE + "/v1/models", { headers: auth })).status, 200);
const after = await fetch(BASE + "/v1/chat/completions", { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: "{}" });
assert.equal(after.status, 401);
console.log("ALL OK");
