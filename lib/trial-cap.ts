// A daily cap on free-trial images shared by everyone. Trial use is counted per browser cookie, which anyone
// can clear, so without this cap one person could spend the media host's credit for free. No IP is involved.
// No imports, so tests can load it with a throwaway database.
import type { DatabaseSync } from "node:sqlite";

export const TRIAL_MEDIA_DAILY = Number(process.env.TRIAL_MEDIA_DAILY || 300);
export const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

export const DAILY_SCHEMA = "create table if not exists trial_daily (day text primary key, media integer not null default 0)"; // same table as lib/db.ts SCHEMA

/** Takes one free image from today's shared pool. False when today's pool is empty. Call inside a transaction. */
export function takeDailyMedia(d: DatabaseSync, day = utcDay(), cap = TRIAL_MEDIA_DAILY) {
  d.prepare("insert or ignore into trial_daily (day) values (?)").run(day);
  return d.prepare("update trial_daily set media = media + 1 where day = ? and media < ?").run(day, cap).changes === 1;
}

export function dailyMediaLeft(d: DatabaseSync, day = utcDay(), cap = TRIAL_MEDIA_DAILY) {
  const r = d.prepare("select media from trial_daily where day = ?").get(day) as { media: number } | undefined;
  return Math.max(0, cap - (r?.media ?? 0));
}
