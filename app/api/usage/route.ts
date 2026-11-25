import { sessionAccount, err } from "@/lib/auth";
import { db, now } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  const since = now() - 30 * 86400_000;
  const q = (group: string) =>
    db
      .prepare(
        `select ${group} k, count(*) calls, sum(tok_in) tok_in, sum(tok_out) tok_out, sum(units) units, sum(cost) cost, sum(coalesce(list_cost, cost)) list
         from calls where account_id = ? and status = 'settled' and created > ? group by k order by k`,
      )
      .all(a.id, since) as Record<string, number | string>[];
  const fix = (r: Record<string, number | string>) => ({ ...r, cost: Number(r.cost) / 1e6, list: Number(r.list) / 1e6 });
  return Response.json({ byDay: q("date(created / 1000, 'unixepoch')").map(fix), byModel: q("model").map(fix) });
}
