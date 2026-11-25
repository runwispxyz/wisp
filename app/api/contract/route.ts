import { getContract, isPlaceholder } from "@/lib/settings";
export const dynamic = "force-dynamic";

/** Public: the live contract address, or null before launch. */
export function GET() {
  const ca = getContract();
  return Response.json({ contract: isPlaceholder(ca) ? null : ca });
}
