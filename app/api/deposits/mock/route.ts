import { randomBytes } from "node:crypto";
import { sessionAccount, err } from "@/lib/auth";
import { MOCK_CHAIN, recordDeposit } from "@/lib/chain";

/** Mock chain only: pretend a transfer landed on the deposit address. */
export async function POST(req: Request) {
  if (!MOCK_CHAIN) return err(403, "Mock deposits are off when a real RPC is configured");
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  const b = (await req.json().catch(() => ({}))) as { token?: string; amount?: number };
  const amount = Number(b.amount);
  if (!(amount > 0 && amount <= 1e9)) return err(400, "amount must be positive");
  recordDeposit(a.id, "0x" + randomBytes(32).toString("hex") + ":0", b.token === "TOKEN" ? "TOKEN" : "USDG", amount);
  return Response.json({ ok: true });
}
