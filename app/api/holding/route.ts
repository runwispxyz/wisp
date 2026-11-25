import { sessionAccount, err } from "@/lib/auth";
import { db } from "@/lib/db";
import { MOCK_CHAIN } from "@/lib/chain";

/** Mock chain only: set how many tokens this wallet holds, for Holder Credit. */
export async function POST(req: Request) {
  if (!MOCK_CHAIN) return err(403, "Holdings come from the chain when a real RPC is configured");
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  const { tokens } = (await req.json().catch(() => ({}))) as { tokens?: number };
  if (!(Number(tokens) >= 0)) return err(400, "tokens must be zero or more");
  db.prepare("update accounts set mock_holding = ? where id = ?").run(Number(tokens), a.id);
  return Response.json({ ok: true });
}
