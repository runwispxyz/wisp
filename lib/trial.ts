import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { sha, TRIAL_COOKIE } from "./auth";

export const TRIAL_PROMPTS = 30;
export const TRIAL_MEDIA = 10;

async function trialId(create: boolean) {
  const jar = await cookies();
  let id = jar.get(TRIAL_COOKIE)?.value;
  if (!id && create) {
    id = randomBytes(16).toString("hex");
    jar.set(TRIAL_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86400 });
  }
  return id ? sha(id) : null;
}

export async function trialState() {
  const h = await trialId(true);
  const r = db.prepare("select used, media from trial where client_hash = ?").get(h) as { used: number; media: number } | undefined;
  return { left: TRIAL_PROMPTS - (r?.used ?? 0), mediaLeft: TRIAL_MEDIA - (r?.media ?? 0), total: TRIAL_PROMPTS };
}

/** Spend one free prompt. Returns false when the trial is used up or the browser never got a trial cookie. */
export async function useTrial(media: boolean) {
  const h = await trialId(false);
  if (!h) return false;
  db.prepare("insert or ignore into trial (client_hash) values (?)").run(h);
  const r = db
    .prepare(`update trial set used = used + 1, media = media + ? where client_hash = ? and used < ? ${media ? "and media < ?" : ""}`)
    .run(...(media ? [1, h, TRIAL_PROMPTS, TRIAL_MEDIA] : [0, h, TRIAL_PROMPTS]));
  return r.changes === 1;
}
