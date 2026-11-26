import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");
mkdirSync(path.join(DATA, "jobs"), { recursive: true });
export const JOBS_DIR = path.join(DATA, "jobs");

const SCHEMA = `
create table if not exists meta (k text primary key, v text);
create table if not exists accounts (
  id integer primary key, addr_hash text unique not null, address text not null,
  balance integer not null default 0, mock_holding real not null default 0, created integer not null);
create table if not exists nonces (nonce text primary key, created integer not null);
create table if not exists sessions (token_hash text primary key, account_id integer not null, expires integer not null);
create table if not exists api_keys (
  id integer primary key, account_id integer not null, name text not null, prefix text not null,
  key_hash text unique not null, cap integer, spent integer not null default 0, expires integer,
  models text, revoked integer not null default 0, created integer not null, last_used integer);
create table if not exists calls (
  id integer primary key, account_id integer, key_id integer, model text not null, kind text not null,
  tok_in integer not null default 0, tok_out integer not null default 0, units real not null default 0,
  held integer not null default 0, cost integer not null default 0, list_cost integer,
  status text not null, source text not null, created integer not null);
create table if not exists deposits (
  ref text primary key, account_id integer not null, token text not null, amount real not null,
  credit integer not null, status text not null, created integer not null);
create table if not exists codes (code text primary key, amount integer not null);
create table if not exists redemptions (code text, account_id integer, created integer, primary key (code, account_id));
create table if not exists trial (client_hash text primary key, used integer not null default 0, media integer not null default 0);
create table if not exists trial_daily (day text primary key, media integer not null default 0);
create table if not exists jobs (
  id text primary key, account_id integer, call_id integer, model text not null, kind text not null,
  status text not null, file text, mime text, error text, created integer not null);
create table if not exists holder_credits (hour integer not null, account_id integer not null, amount integer not null, primary key (hour, account_id));
create index if not exists calls_acct on calls(account_id, created);
`;

const g = globalThis as unknown as { __db?: DatabaseSync };
export const db: DatabaseSync =
  g.__db ??
  (() => {
    const d = new DatabaseSync(path.join(DATA, "wisp.db"));
    d.exec("pragma busy_timeout = 5000; pragma journal_mode = wal;"); // busy_timeout first: switching to WAL can itself hit a lock (parallel build workers)
    d.exec(SCHEMA);
    for (const pair of (process.env.REDEEM_CODES || "").split(",").filter(Boolean)) {
      const [code, dollars] = pair.split(":");
      d.prepare("insert or ignore into codes (code, amount) values (?, ?)").run(code.trim().toUpperCase(), Math.round(Number(dollars) * 1e6));
    }
    g.__db = d;
    return d;
  })();

export const now = () => Date.now();

/** Per-call billing rows link an account to its usage, so they are kept only as long as the app reads them (usage, spend: 30 days). */
export const CALL_RETENTION_DAYS = 30;
export function purgeOldCalls(at = now()) {
  // open holds are never purged: they still have to settle or be released
  return db.prepare("delete from calls where status != 'held' and created < ?").run(at - CALL_RETENTION_DAYS * 86400_000).changes;
}

export function meta(k: string, init?: () => string): string | undefined {
  const row = db.prepare("select v from meta where k = ?").get(k) as { v: string } | undefined;
  if (row) return row.v;
  if (!init) return undefined;
  const v = init();
  db.prepare("insert into meta (k, v) values (?, ?)").run(k, v);
  return v;
}

export function tx<T>(fn: () => T): T {
  db.exec("begin immediate");
  try {
    const r = fn();
    db.exec("commit");
    return r;
  } catch (e) {
    db.exec("rollback");
    throw e;
  }
}
