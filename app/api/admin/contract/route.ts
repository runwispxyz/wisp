import { isAddress, getAddress } from "viem";
import { isAdmin } from "@/lib/admin";
import { err } from "@/lib/auth";
import { getContract, isPlaceholder, setContract } from "@/lib/settings";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return err(401, "Not signed in as admin");
  const ca = getContract();
  return Response.json({ contract: isPlaceholder(ca) ? "" : ca });
}

/** Body {contract}: an EVM address, or "" to clear it back to the placeholder. */
export async function PUT(req: Request) {
  if (!(await isAdmin())) return err(401, "Not signed in as admin");
  const { contract } = (await req.json().catch(() => ({}))) as { contract?: string };
  const v = String(contract ?? "").trim();
  if (v && !isAddress(v, { strict: false })) return err(400, "That is not a valid contract address (0x followed by 40 hex characters).");
  const ca = v ? getAddress(v) : null; // checksummed
  setContract(ca);
  return Response.json({ ok: true, contract: ca ?? "" });
}
