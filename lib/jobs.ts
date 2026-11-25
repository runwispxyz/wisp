import { randomBytes } from "node:crypto";
import { writeFileSync, unlinkSync, readFileSync } from "node:fs";
import path from "node:path";
import { db, now, JOBS_DIR } from "./db";
import { hold, settle } from "./billing";
import { getModel, mediaCost } from "./models";
import { err, keyBlocks, type Auth } from "./auth";
import { upstreamImage } from "./nvidia";

export type Job = { id: string; model: string; kind: string; status: string; mime: string | null; error: string | null; created: number; cost?: number };

const unitsFor = (kind: string, seconds: number) => (kind === "video" ? Math.min(Math.max(seconds, 2), 10) : 1);

export function createJob(auth: Auth | null, body: { model?: string; prompt?: string; seconds?: number }, source: string): Response {
  const m = getModel(String(body.model || ""));
  if (!m || m.kind === "chat") return err(404, `Unknown media model ${body.model}`, "model_not_found");
  if (!auth && !m.free) return err(401, "Connect a wallet to use this model");
  const prompt = String(body.prompt || "").trim();
  if (!prompt) return err(400, "prompt is required");
  const units = unitsFor(m.kind, Number(body.seconds) || 6);
  const cost = mediaCost(m, units)!;
  const block = keyBlocks(auth?.key, m, cost);
  if (block) return err(403, block, "permission_error");
  const h = hold({ accountId: auth?.account.id ?? null, keyId: auth?.key?.id, model: m.id, kind: m.kind, amount: cost, source });
  if (!h) return err(402, "Balance too low for this job's hold. Top up and try again.", "insufficient_balance");

  const id = "job_" + randomBytes(10).toString("hex");
  db.prepare("insert into jobs (id, account_id, call_id, model, kind, status, created) values (?, ?, ?, ?, ?, 'running', ?)").run(
    id, auth?.account.id ?? null, h.callId, m.id, m.kind, now(),
  );

  // Runs in-process. shortcut: a server restart mid-job leaves it "running" with the hold kept; move to a queue for production.
  (async () => {
    try {
      if (m.kind !== "image") throw new Error(`No provider is wired in for ${m.kind} yet`);
      const [file, mime, ext] = [await upstreamImage(m.upstream, prompt), "image/jpeg", "jpg"];
      const name = `${id}.${ext}`;
      writeFileSync(path.join(JOBS_DIR, name), file);
      settle(h, { cost, listCost: mediaCost(m, units, true), units });
      db.prepare("update jobs set status = 'succeeded', file = ?, mime = ? where id = ?").run(name, mime, id);
    } catch (e) {
      settle(h, { cost: 0, listCost: null, failed: true });
      db.prepare("update jobs set status = 'failed', error = ? where id = ?").run(String((e as Error).message), id);
    }
  })();

  return Response.json({ id, object: "job", model: m.id, kind: m.kind, status: "running", held: cost / 1e6 }, { status: 202 });
}

export function getJob(id: string, accountId: number | null) {
  const j = db.prepare("select j.*, c.cost from jobs j left join calls c on c.id = j.call_id where j.id = ?").get(id) as
    | (Job & { account_id: number | null; file: string | null })
    | undefined;
  if (!j || j.account_id !== accountId) return null;
  return j;
}

/** Media is handed over once, then removed from the server. */
export function takeJobFile(j: { id: string; file: string | null }) {
  if (!j.file) return null;
  const p = path.join(JOBS_DIR, j.file);
  const buf = readFileSync(p);
  try { unlinkSync(p); } catch {}
  db.prepare("update jobs set file = null, status = 'delivered' where id = ?").run(j.id);
  return buf;
}
