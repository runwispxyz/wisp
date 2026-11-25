import { sessionAccount, err } from "@/lib/auth";
import { db, now } from "@/lib/db";
import { depositAddress, holding, isEligible, MOCK_CHAIN, scanDeposits, sweepHolderCredit, tokenConfig } from "@/lib/chain";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  await Promise.allSettled([scanDeposits(), sweepHolderCredit()]);
  const fresh = db.prepare("select balance, mock_holding from accounts where id = ?").get(a.id) as { balance: number; mock_holding: number };
  const since = now() - 30 * 86400_000;
  const s = db
    .prepare("select count(*) n, coalesce(sum(cost),0) spent, coalesce(sum(coalesce(list_cost, cost)),0) list from calls where account_id = ? and status = 'settled' and created > ?")
    .get(a.id, since) as { n: number; spent: number; list: number };
  const hc = db.prepare("select coalesce(sum(amount),0) total, max(hour) last from holder_credits where account_id = ?").get(a.id) as { total: number; last: number | null };
  const held = await holding(a.address, fresh.mock_holding).catch(() => 0);
  return Response.json({
    address: a.address,
    balance: fresh.balance / 1e6,
    depositAddress: depositAddress(a.id),
    mockChain: MOCK_CHAIN,
    last30: { calls: s.n, spent: s.spent / 1e6, list: s.list / 1e6, saved: (s.list - s.spent) / 1e6 },
    holder: {
      tokens: held, valueUsd: held * tokenConfig.price, eligible: isEligible(held), minTokens: tokenConfig.minTokens,
      earned: hc.total / 1e6, lastHour: hc.last, min: tokenConfig.min, pool: tokenConfig.pool, price: tokenConfig.price,
    },
  });
}
