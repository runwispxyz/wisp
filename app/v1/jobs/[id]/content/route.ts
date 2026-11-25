import { authenticate, err } from "@/lib/auth";
import { getJob, takeJobFile } from "@/lib/jobs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (auth === "invalid") return err(401, "Invalid API key", "authentication_error");
  const j = getJob((await params).id, auth ? auth.account.id : null);
  if (!j || j.status !== "succeeded") return err(404, "Nothing to download (not ready, failed, or already downloaded)");
  const buf = takeJobFile(j);
  if (!buf) return err(410, "Already downloaded");
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": j.mime || "application/octet-stream", "Cache-Control": "no-store" } });
}
