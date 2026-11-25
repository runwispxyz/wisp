import { authenticate, err } from "@/lib/auth";
import { getJob } from "@/lib/jobs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  if (auth === "invalid") return err(401, "Invalid API key", "authentication_error");
  const j = getJob((await params).id, auth ? auth.account.id : null);
  if (!j) return err(404, "Job not found");
  return Response.json({
    id: j.id, object: "job", model: j.model, kind: j.kind, status: j.status, error: j.error, mime: j.mime,
    charged: j.cost == null ? null : j.cost / 1e6, content_url: j.status === "succeeded" ? `/v1/jobs/${j.id}/content` : null,
  });
}
