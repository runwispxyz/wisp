// Checks that the site's Supply line matches totalSupply() on-chain, using a known token as a stand-in CA,
// then puts the CA back. Password comes from the environment:
//   $env:ADMIN_PW="..."; node scripts/supply-check.mjs http://localhost:3000 [tokenAddress]
import assert from "node:assert/strict";
import { createPublicClient, erc20Abi, formatUnits, http } from "viem";

const BASE = process.argv[2] || "http://localhost:3000";
const TOKEN = process.argv[3] || "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"; // USDG on Robinhood Chain
assert.ok(process.env.ADMIN_PW, "set ADMIN_PW");
let cookie = "";
const call = async (path, init = {}) => {
  const r = await fetch(BASE + path, { ...init, headers: { "Content-Type": "application/json", cookie, ...init.headers } });
  for (const c of r.headers.getSetCookie?.() || []) if (c.startsWith("wisp_admin=")) cookie = c.split(";")[0];
  return r;
};

const c = createPublicClient({ transport: http("https://robinhood.api.pocket.network") });
const [raw, dec] = await Promise.all([
  c.readContract({ address: TOKEN, abi: erc20Abi, functionName: "totalSupply" }),
  c.readContract({ address: TOKEN, abi: erc20Abi, functionName: "decimals" }),
]);
const want = Number(formatUnits(raw, dec)).toLocaleString("en-US", { maximumFractionDigits: 2 });

const before = (await (await fetch(BASE + "/api/contract")).json()).contract;
assert.equal((await call("/api/admin/login", { method: "POST", body: JSON.stringify({ password: process.env.ADMIN_PW }) })).status, 200);
try {
  assert.equal((await call("/api/admin/contract", { method: "PUT", body: JSON.stringify({ contract: TOKEN }) })).status, 200);
  const text = (await (await fetch(BASE + "/token")).text()).replace(/<[^>]+>/g, " ");
  const shown = text.match(/Supply\s+([\d,\.]+)/)?.[1];
  // supply can tick between the two reads for a live token; compare the leading digits
  assert.ok(shown, "no Supply figure on /token");
  assert.equal(shown.split(",")[0], want.split(",")[0], `site shows ${shown}, chain says ${want}`);
  assert.equal(shown.split(",").length, want.split(",").length);
  const home = (await (await fetch(BASE + "/")).text()).replace(/<[^>]+>/g, " ");
  assert.ok(home.includes(shown), "home does not show the same supply");
  console.log(`SUPPLY OK: site ${shown}, chain ${want}`);
} finally {
  await call("/api/admin/contract", { method: "PUT", body: JSON.stringify({ contract: before ?? "" }) });
  await call("/api/admin/logout", { method: "POST" });
  console.log("CA restored to", before ?? "(empty)");
}
