// Checks host-based routing the way the reverse proxy sends requests (Host + X-Forwarded-Proto: https).
//   node scripts/subdomain-check.mjs http://127.0.0.1:3091 runwisp.xyz
import assert from "node:assert/strict";
import http from "node:http";

const BASE = new URL(process.argv[2] || "http://127.0.0.1:3000");
const DOMAIN = process.argv[3] || "runwisp.xyz";
// node:http, because fetch() will not send a custom Host header
const get = (host, path) =>
  new Promise((resolve, reject) => {
    const req = http.get({ hostname: BASE.hostname, port: BASE.port, path, headers: { host, "x-forwarded-proto": "https", "x-forwarded-host": host } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (text += c));
      res.on("end", () => resolve({ status: res.statusCode, text, type: res.headers["content-type"] || "" }));
    });
    req.on("error", reject);
  });
const title = (t) => (t.match(/<title>([^<]*)<\/title>/) || [])[1] || "";

const cases = [
  // [host, path, expected status, title must include]
  [DOMAIN, "/", 200, "Wisp"],
  [`chat.${DOMAIN}`, "/", 200, "Chat"],
  [`console.${DOMAIN}`, "/", 200, "Dashboard"],
  [`console.${DOMAIN}`, "/keys", 200, "API keys"],
  [`console.${DOMAIN}`, "/console/keys", 200, "API keys"], // links inside the console use /console/...
  [`console.${DOMAIN}`, "/models/flux.1-schnell", 200, "FLUX"],
];
for (const [host, path, status, want] of cases) {
  const r = await get(host, path);
  assert.equal(r.status, status, `${host}${path} -> ${r.status}`);
  assert.ok(title(r.text).includes(want), `${host}${path} title "${title(r.text)}" lacks "${want}"`);
  console.log(`ok  ${host}${path} -> ${r.status} "${title(r.text)}"`);
}
// API, model list and static files must not be moved under /console or /chat
for (const [host, path, type] of [[`chat.${DOMAIN}`, "/api/trial", "json"], [`console.${DOMAIN}`, "/v1/models", "json"], [`chat.${DOMAIN}`, "/brand/mark.png", "image/png"], [`console.${DOMAIN}`, "/icon.png", "image/png"]]) {
  const r = await get(host, path);
  assert.equal(r.status, 200, `${host}${path} -> ${r.status}`);
  assert.ok(r.type.includes(type), `${host}${path} type ${r.type}`);
  console.log(`ok  ${host}${path} -> ${r.status} ${r.type.split(";")[0]}`);
}
console.log("SUBDOMAINS OK");
