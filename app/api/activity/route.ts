import { sessionAccount, err } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  const rows = db
    .prepare(
      `select c.id, c.model, c.kind, c.tok_in, c.tok_out, c.units, c.held, c.cost, c.list_cost, c.status, c.source, c.created, k.prefix key
       from calls c left join api_keys k on k.id = c.key_id where c.account_id = ? order by c.created desc limit 200`,
    )
    .all(a.id) as Record<string, number | string | null>[];
  return Response.json({
    calls: rows.map((r) => ({ ...r, held: Number(r.held) / 1e6, cost: Number(r.cost) / 1e6, list_cost: r.list_cost == null ? null : Number(r.list_cost) / 1e6 })),
  });
}
