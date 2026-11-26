import { CALL_RETENTION_DAYS, db } from "@/lib/db";

function billingRows(t: number) {
  const r = db.prepare("select count(*) n, min(created) oldest from calls where status != 'held'").get() as { n: number; oldest: number | null };
  return { count: r.n, oldest_days: r.oldest == null ? null : Math.floor(((t - r.oldest) / 86400_000) * 10) / 10, deleted_after_days: CALL_RETENTION_DAYS };
}
import { upstreamOk } from "@/lib/nvidia";
import { watcherHealth } from "@/lib/chain";
import { MODELS, type Model } from "@/lib/models";
import { kieAffords, kieCredits } from "@/lib/kie";
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
      media(),
    ],
    // the exact commit this server runs, so the public repo can be checked against what is deployed
    build: process.env.NEXT_PUBLIC_BUILD_SHA || null,
    // retention you can watch: rows are deleted after CALL_RETENTION_DAYS, so oldest_days should never exceed it
    billing_rows: billingRows(t),
    models: MODELS.map((m) => {
      const s = stats.find((x) => x.model === m.id);
      const answers = !s || s.failed < s.n;
      return { id: m.id, name: m.name, kind: m.kind, demo: !!m.demo, calls24h: s?.n ?? 0, failed24h: s?.failed ?? 0, ok: m.demo ? true : hostUp(m, host) && answers };
    }),
  });
}

// each model is judged by its own host: NVIDIA by the reachability check, kie.ai by whether its balance covers one job
const one = (m: Model) => (m.kind === "video" ? 6 : 1);
function hostUp(m: Model, nvidia: boolean) {
  if (m.upstream.startsWith("kie:")) return kieAffords(m.upstream, one(m));
  if (m.upstream.startsWith("anthropic:")) return true;
  return nvidia;
}
/** Image, video and music availability; the balance itself is not published. */
function media() {
  if (kieCredits() == null) return { name: "Media", ok: false, note: "media host balance unknown" };
  const kinds = (["image", "video", "music"] as const).map((k) => {
    const m = MODELS.find((x) => x.kind === k && x.upstream.startsWith("kie:"));
    return { k, ok: !!m && kieAffords(m.upstream, one(m)) };
  });
  return { name: "Media", ok: kinds.every((x) => x.ok), note: kinds.map((x) => `${x.k} ${x.ok ? "ok" : "paused"}`).join(" · ") };
}
