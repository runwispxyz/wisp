import { CALL_RETENTION_DAYS, db } from "@/lib/db";

function billingRows(t: number) {
  const r = db.prepare("select count(*) n, min(created) oldest from calls where status != 'held'").get() as { n: number; oldest: number | null };
  return { count: r.n, oldest_days: r.oldest == null ? null : Math.floor(((t - r.oldest) / 86400_000) * 10) / 10, deleted_after_days: CALL_RETENTION_DAYS };
}
import { upstreamOk } from "@/lib/nvidia";
import { watcherHealth } from "@/lib/chain";
import { MODELS } from "@/lib/models";
export const dynamic = "force-dynamic";

let cache: { at: number; ok: boolean; ms: number } | null = null;

export async function GET() {
  const t = Date.now();
  if (!cache || t - cache.at > 20_000) {
    const ok = await upstreamOk();
    cache = { at: t, ok, ms: Date.now() - t };
  }
  const { ok: host, ms } = cache;
  let dbOk = true;
  try {
    db.prepare("select 1").get();
  } catch {
    dbOk = false;
  }
  const stats = db
    .prepare("select model, count(*) n, sum(status = 'failed') failed from calls where created > ? group by model")
    .all(t - 86400_000) as { model: string; n: number; failed: number }[];
  return Response.json({
    checked: t,
    services: [
      { name: "API", ok: host && dbOk, note: `${ms} ms to the model host` },
      { name: "Chat", ok: dbOk, note: "" },
      { name: "Console", ok: dbOk, note: "" },
      { name: "Chain", ...watcherHealth() },
    ],
    // the exact commit this server runs, so the public repo can be checked against what is deployed
    build: process.env.NEXT_PUBLIC_BUILD_SHA || null,
    // retention you can watch: rows are deleted after CALL_RETENTION_DAYS, so oldest_days should never exceed it
    billing_rows: billingRows(t),
    models: MODELS.map((m) => {
      const s = stats.find((x) => x.model === m.id);
      return { id: m.id, name: m.name, kind: m.kind, demo: !!m.demo, calls24h: s?.n ?? 0, failed24h: s?.failed ?? 0, ok: m.demo ? true : host && (!s || s.failed < s.n) };
    }),
  });
}
