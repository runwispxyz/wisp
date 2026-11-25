import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db, now } from "./db";
import type { Model } from "./models";

const SECRET = process.env.SESSION_SECRET || "dev-only-secret";
export const SESSION_COOKIE = "wisp_session";
export const TRIAL_COOKIE = "wisp_trial";
const DAY = 86400_000;

/** HTTPS as seen by the visitor; behind Caddy the app itself only sees http on 127.0.0.1. */
export const isHttps = (req: Request) => req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https");
export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const addrHash = (a: string) => createHmac("sha256", SECRET).update(a.toLowerCase()).digest("hex");

export type Account = { id: number; address: string; balance: number; mock_holding: number; created: number };
export type ApiKey = {
  id: number; account_id: number; name: string; prefix: string; cap: number | null; spent: number;
  expires: number | null; models: string | null; revoked: number; created: number; last_used: number | null;
};
export type Auth = { account: Account; key?: ApiKey };

export function newNonce() {
  const n = randomBytes(12).toString("hex");
  db.prepare("delete from nonces where created < ?").run(now() - 10 * 60_000);
  db.prepare("insert into nonces (nonce, created) values (?, ?)").run(n, now());
  return n;
}
export function useNonce(n: string) {
  const r = db.prepare("delete from nonces where nonce = ? and created > ?").run(n, now() - 10 * 60_000);
  return r.changes === 1;
}

export function upsertAccount(address: string): Account {
  const h = addrHash(address);
  db.prepare("insert or ignore into accounts (addr_hash, address, created) values (?, ?, ?)").run(h, address.toLowerCase(), now());
  return db.prepare("select id, address, balance, mock_holding, created from accounts where addr_hash = ?").get(h) as Account;
}

export function createSession(accountId: number) {
  const token = randomBytes(32).toString("hex");
  db.prepare("insert into sessions (token_hash, account_id, expires) values (?, ?, ?)").run(sha(token), accountId, now() + DAY);
  return token;
}

export const getAccountById = (id: number) =>
  db.prepare("select id, address, balance, mock_holding, created from accounts where id = ?").get(id) as Account | undefined;

export async function sessionAccount(): Promise<Account | null> {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!t) return null;
  const s = db.prepare("select account_id from sessions where token_hash = ? and expires > ?").get(sha(t), now()) as { account_id: number } | undefined;
  return s ? getAccountById(s.account_id) ?? null : null;
}

export function keyFromBearer(req: Request): ApiKey | null | "invalid" {
  const h = req.headers.get("authorization") || req.headers.get("x-api-key") || "";
  const raw = h.replace(/^Bearer\s+/i, "").trim();
  if (!raw) return null;
  const k = db.prepare("select * from api_keys where key_hash = ?").get(sha(raw)) as ApiKey | undefined;
  if (!k || k.revoked || (k.expires && k.expires < now())) return "invalid";
  return k;
}

/** Bearer key wins; otherwise the browser session. */
export async function authenticate(req: Request): Promise<Auth | null | "invalid"> {
  const k = keyFromBearer(req);
  if (k === "invalid") return "invalid";
  if (k) {
    const account = getAccountById(k.account_id);
    return account ? { account, key: k } : "invalid";
  }
  const account = await sessionAccount();
  return account ? { account } : null;
}

/** Returns an error string if this key may not call this model or spend this much. */
export function keyBlocks(k: ApiKey | undefined, m: Model, hold: number): string | null {
  if (!k) return null;
  if (k.models) {
    const allowed = JSON.parse(k.models) as string[];
    if (allowed.length && !allowed.includes(m.id)) return `This key is not allowed to call ${m.id}`;
  }
  if (k.cap != null && k.spent + hold > k.cap) return "This key has reached its spend cap";
  return null;
}

export function newApiKey() {
  const raw = "wsp_" + randomBytes(24).toString("hex");
  return { raw, hash: sha(raw), prefix: raw.slice(0, 8) + "…" + raw.slice(-4) };
}

export const json = (data: unknown, status = 200, headers?: Record<string, string>) =>
  Response.json(data, { status, headers });
export const err = (status: number, message: string, type = "invalid_request_error") =>
  Response.json({ error: { message, type } }, { status });
