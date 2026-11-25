import { newNonce } from "@/lib/auth";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ nonce: newNonce(), chainId: Number(process.env.CHAIN_ID || 4663) });
}
