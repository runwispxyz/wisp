import { sessionAccount, err } from "@/lib/auth";
import { db } from "@/lib/db";
import { getModel } from "@/lib/models";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { name?: string; cap?: number | null; models?: string[] };
  const k = db.prepare("select id from api_keys where id = ? and account_id = ? and revoked = 0").get(id, a.id);
  if (!k) return err(404, "Key not found");
  if (b.name !== undefined) db.prepare("update api_keys set name = ? where id = ?").run(String(b.name).slice(0, 60) || "Untitled key", id);
  if (b.cap !== undefined) db.prepare("update api_keys set cap = ? where id = ?").run(b.cap ? Math.round(b.cap * 1e6) : null, id);
  if (b.models !== undefined) {
    const m = b.models.filter((x) => getModel(x));
    db.prepare("update api_keys set models = ? where id = ?").run(m.length ? JSON.stringify(m) : null, id);
  }
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  const { id } = await params;
  const r = db.prepare("update api_keys set revoked = 1 where id = ? and account_id = ?").run(id, a.id);
  return r.changes ? Response.json({ ok: true }) : err(404, "Key not found");
}
