import { authenticate, err } from "@/lib/auth";
import { createJob, unitsFor } from "@/lib/jobs";
import { useTrial } from "@/lib/trial";
import { getModel } from "@/lib/models";
import { kieAffords } from "@/lib/kie";

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (auth === "invalid") return err(401, "Invalid, revoked or expired API key", "authentication_error");
  const body = (await req.json().catch(() => ({}))) as { model?: string; prompt?: string; seconds?: number };
  const m = getModel(String(body.model));
  // before the trial and the hold: a job our media host can't pay for is refused with nothing spent
  if (m && m.upstream.startsWith("kie:") && !kieAffords(m.upstream, unitsFor(m.kind, Number(body.seconds) || 6)))
    return err(503, `${m.kind[0].toUpperCase() + m.kind.slice(1)} is paused for now: our media host is out of credit. Nothing was charged; try again later.`, "service_unavailable");
  if (!auth) {
    if (!m?.free) return err(401, "Send an API key, or connect a wallet", "authentication_error");
    const t = await useTrial(true);
    if (t === "daily_cap") return err(402, "Today's free images are used up for everyone. They come back at 00:00 UTC, or connect a wallet to keep going.", "trial_exhausted");
    if (t !== "ok") return err(402, "Free media prompts are used up. Connect a wallet to keep going.", "trial_exhausted");
  }
  return createJob(auth, body, auth?.key ? "api" : auth ? "app" : "trial");
}
