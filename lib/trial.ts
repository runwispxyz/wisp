import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db, tx } from "./db";
import { sha, TRIAL_COOKIE } from "./auth";
import { takeDailyMedia, dailyMediaLeft } from "./trial-cap";

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
  // mediaLeft also respects today's shared pool, so the UI stops offering free images once it is empty
  return { left: TRIAL_PROMPTS - (r?.used ?? 0), mediaLeft: Math.min(TRIAL_MEDIA - (r?.media ?? 0), dailyMediaLeft(db)), total: TRIAL_PROMPTS };
}

class DailyCap extends Error {}

/**
 * Spend one free prompt. "used_up" when this browser's trial is spent (or it never got a trial cookie),
 * "daily_cap" when it is an image and today's shared pool of free images is empty.
 */
export async function useTrial(media: boolean): Promise<"ok" | "used_up" | "daily_cap"> {
  const h = await trialId(false);
  if (!h) return "used_up";
  try {
    return tx(() => {
      db.prepare("insert or ignore into trial (client_hash) values (?)").run(h);
      const r = db
        .prepare(`update trial set used = used + 1, media = media + ? where client_hash = ? and used < ? ${media ? "and media < ?" : ""}`)
        .run(...(media ? [1, h, TRIAL_PROMPTS, TRIAL_MEDIA] : [0, h, TRIAL_PROMPTS]));
      if (r.changes !== 1) return "used_up" as const;
      if (media && !takeDailyMedia(db)) throw new DailyCap(); // rolls back this browser's count too
      return "ok" as const;
    });
  } catch (e) {
    if (e instanceof DailyCap) return "daily_cap";
    throw e;
  }
}
