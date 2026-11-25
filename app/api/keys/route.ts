import { sessionAccount, newApiKey, err } from "@/lib/auth";
import { db, now } from "@/lib/db";
import { getModel } from "@/lib/models";
export const dynamic = "force-dynamic";

const view = (k: Record<string, unknown>) => ({
  id: k.id, name: k.name, prefix: k.prefix, cap: k.cap == null ? null : Number(k.cap) / 1e6, spent: Number(k.spent) / 1e6,
  expires: k.expires, models: k.models ? JSON.parse(String(k.models)) : [], revoked: !!k.revoked, created: k.created, lastUsed: k.last_used,
});

export async function GET() {
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  const rows = db.prepare("select * from api_keys where account_id = ? order by created desc").all(a.id) as Record<string, unknown>[];
  return Response.json({ keys: rows.map(view) });
}

export async function POST(req: Request) {
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  const b = (await req.json().catch(() => ({}))) as { name?: string; cap?: number | null; expiresDays?: number | null; models?: string[] };
  const name = String(b.name || "").trim().slice(0, 60) || "Untitled key";
  const models = (b.models || []).filter((id) => getModel(id));
  const count = (db.prepare("select count(*) n from api_keys where account_id = ? and revoked = 0").get(a.id) as { n: number }).n;
  if (count >= 25) return err(400, "Up to 25 live keys per account");
  const k = newApiKey();
  db.prepare("insert into api_keys (account_id, name, prefix, key_hash, cap, expires, models, created) values (?, ?, ?, ?, ?, ?, ?, ?)").run(
    a.id, name, k.prefix, k.hash, b.cap ? Math.round(b.cap * 1e6) : null, b.expiresDays ? now() + b.expiresDays * 86400_000 : null,
    models.length ? JSON.stringify(models) : null, now(),
  );
  // The full key is shown once and never stored.
  return Response.json({ key: k.raw, prefix: k.prefix }, { status: 201 });
}
