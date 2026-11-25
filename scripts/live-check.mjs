// Live-mode checks that move no money: sign-in, deposit address, mock paths closed, scanner following mainnet.
//   node scripts/live-check.mjs http://localhost:3000
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createSiweMessage } from "viem/siwe";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, isAddress } from "viem";

const BASE = process.argv[2] || "http://localhost:3000";
let cookie = "";
const call = async (path, init = {}) => {
  const r = await fetch(BASE + path, { ...init, headers: { "Content-Type": "application/json", cookie, ...init.headers } });
  for (const c of r.headers.getSetCookie?.() || []) if (c.startsWith("wisp_session=")) cookie = c.split(";")[0];
  return r;
};

const st = await (await fetch(BASE + "/api/status")).json();
assert.equal(st.services.find((s) => s.name === "Chain").note, "RPC", "server is not in live mode");

const acct = privateKeyToAccount(generatePrivateKey());
const { nonce, chainId } = await (await call("/api/auth/nonce")).json();
assert.equal(chainId, 4663);
const message = createSiweMessage({ domain: new URL(BASE).host, address: acct.address, uri: BASE, version: "1", chainId, nonce });
assert.equal((await call("/api/auth/verify", { method: "POST", body: JSON.stringify({ message, signature: await acct.signMessage({ message }) }) })).status, 200);

const me = await (await call("/api/me")).json();
assert.equal(me.mockChain, false);
assert.equal(me.balance, 0);
assert.ok(isAddress(me.depositAddress));
assert.equal(me.holder.pool, 0);
console.log("signed in", me.address.slice(0, 10), "→ deposit address", me.depositAddress);

assert.equal((await call("/api/deposits/mock", { method: "POST", body: JSON.stringify({ token: "USDG", amount: 100 }) })).status, 403, "mock deposits must be closed");
assert.equal((await call("/api/holding", { method: "POST", body: JSON.stringify({ tokens: 1e9 }) })).status, 403, "mock holdings must be closed");
assert.equal((await call("/api/redeem", { method: "POST", body: JSON.stringify({ code: "WELCOME5" }) })).status, 404, "dev code must be gone");
assert.equal((await call("/v1/chat/completions", { method: "POST", body: JSON.stringify({ model: "mistral-large-4", messages: [{ role: "user", content: "hi" }] }) })).status, 402, "zero balance must not spend");

const deps = await (await call("/api/deposits")).json();
assert.equal(deps.scanError, null, "scan error: " + deps.scanError);
assert.equal(deps.deposits.length, 0);

// the scanner cursor must track the chain head
const db = new DatabaseSync("data/wisp.db", { readOnly: true });
const cursor = () => BigInt(db.prepare("select v from meta where k = 'scan_cursor'").get()?.v ?? 0);
const head = await createPublicClient({ transport: http("https://robinhood.api.pocket.network") }).getBlockNumber();
const c1 = cursor();
await new Promise((r) => setTimeout(r, 25_000));
const c2 = cursor();
assert.ok(c2 > c1, `cursor did not move (${c1} → ${c2})`);
assert.ok(head - c2 < 2000n, `cursor ${c2} is far behind head ${head}`);
console.log(`scanner cursor ${c1} → ${c2} in 25 s (head ${head}, lag ${head - c2} blocks)`);
console.log("LIVE OK");
