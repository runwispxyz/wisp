import { db } from "@/lib/db";
import { upstreamOk } from "@/lib/nvidia";
import { MOCK_CHAIN } from "@/lib/chain";
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
      { name: "Chain", ok: true, note: MOCK_CHAIN ? "mock chain" : "RPC" },
    ],
    models: MODELS.map((m) => {
      const s = stats.find((x) => x.model === m.id);
      return { id: m.id, name: m.name, kind: m.kind, demo: !!m.demo, calls24h: s?.n ?? 0, failed24h: s?.failed ?? 0, ok: m.demo ? true : host && (!s || s.failed < s.n) };
    }),
  });
}
