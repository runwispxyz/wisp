import { sessionAccount, err } from "@/lib/auth";
import { db, now, tx } from "@/lib/db";
import { credit } from "@/lib/billing";

export async function POST(req: Request) {
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const c = db.prepare("select code, amount from codes where code = ?").get(String(code || "").trim().toUpperCase()) as { code: string; amount: number } | undefined;
  if (!c) return err(404, "That code does not exist");
  const ok = tx(() => {
    const r = db.prepare("insert or ignore into redemptions (code, account_id, created) values (?, ?, ?)").run(c.code, a.id, now());
    if (r.changes === 1) credit(a.id, c.amount);
    return r.changes === 1;
  });
  return ok ? Response.json({ ok: true, added: c.amount / 1e6 }) : err(409, "This account already used that code");
}
