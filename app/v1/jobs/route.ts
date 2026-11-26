import { authenticate, err } from "@/lib/auth";
import { createJob } from "@/lib/jobs";
import { useTrial } from "@/lib/trial";
import { getModel } from "@/lib/models";

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (auth === "invalid") return err(401, "Invalid, revoked or expired API key", "authentication_error");
  const body = (await req.json().catch(() => ({}))) as { model?: string; prompt?: string; seconds?: number };
  if (!auth) {
    if (!getModel(String(body.model))?.free) return err(401, "Send an API key, or connect a wallet", "authentication_error");
    const t = await useTrial(true);
    if (t === "daily_cap") return err(402, "Today's free images are used up for everyone. They come back at 00:00 UTC, or connect a wallet to keep going.", "trial_exhausted");
    if (t !== "ok") return err(402, "Free media prompts are used up. Connect a wallet to keep going.", "trial_exhausted");
  }
  return createJob(auth, body, auth?.key ? "api" : auth ? "app" : "trial");
}
