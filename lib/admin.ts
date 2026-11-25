import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db, now } from "./db";
import { isHttps, sha } from "./auth";
import { verifyPassword } from "./password";

export const ADMIN_COOKIE = "wisp_admin";
const TTL = 12 * 3600_000;
db.exec("create table if not exists admin_sessions (token_hash text primary key, expires integer not null)");

// Brute-force guard: 5 failed logins per client per 15 minutes.
// shortcut: in-memory, so it resets on restart and is per server process; move to the DB or Redis if you run several instances.
const fails = new Map<string, number[]>();
const WINDOW = 15 * 60_000, MAX = 5, MAX_ALL = 30; // "*" caps everyone, since x-forwarded-for can be forged
const recent = (k: string) => {
  const r = (fails.get(k) || []).filter((t) => t > now() - WINDOW);
  fails.set(k, r);
  return r.length;
};
export const loginBlocked = (client: string) => recent(client) >= MAX || recent("*") >= MAX_ALL;
const noteFail = (client: string) => {
  for (const k of [client, "*"]) fails.set(k, [...(fails.get(k) || []), now()]);
};

export const clientOf = (req: Request) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";

/** Checks the password; on success sets the admin cookie. */
export async function adminLogin(req: Request, password: string) {
  const client = clientOf(req);
  if (loginBlocked(client)) return "blocked" as const;
  if (!process.env.ADMIN_PASSWORD_HASH) return "unset" as const;
  if (!verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)) {
    noteFail(client);
    return "wrong" as const;
  }
  fails.delete(client);
  const token = randomBytes(32).toString("hex");
  db.prepare("delete from admin_sessions where expires < ?").run(now());
  db.prepare("insert into admin_sessions (token_hash, expires) values (?, ?)").run(sha(token), now() + TTL);
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: isHttps(req), path: "/", maxAge: TTL / 1000 });
  return "ok" as const;
}

export async function isAdmin() {
  const t = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!t) return false;
  return !!db.prepare("select 1 from admin_sessions where token_hash = ? and expires > ?").get(sha(t), now());
}

export async function adminLogout() {
  const jar = await cookies();
  const t = jar.get(ADMIN_COOKIE)?.value;
  if (t) db.prepare("delete from admin_sessions where token_hash = ?").run(sha(t));
  jar.delete(ADMIN_COOKIE);
}
