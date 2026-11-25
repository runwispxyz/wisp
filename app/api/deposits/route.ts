import { sessionAccount, err } from "@/lib/auth";
import { depositAddress, listDeposits, MOCK_CHAIN, scanDeposits } from "@/lib/chain";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await sessionAccount();
  if (!a) return err(401, "Not signed in");
  let scanError: string | null = null;
  await scanDeposits().catch((e) => (scanError = String(e?.message || e)));
  return Response.json({
    address: depositAddress(a.id), mockChain: MOCK_CHAIN, scanError,
    deposits: listDeposits(a.id).map((d) => ({ ...d, credit: d.credit / 1e6 })),
  });
}
