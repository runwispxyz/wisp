import { authenticate, err } from "@/lib/auth";
import { handleChat } from "@/lib/chat";
import { useTrial } from "@/lib/trial";
import { getModel } from "@/lib/models";

export async function POST(req: Request) {
  const auth = await authenticate(req);
  if (auth === "invalid") return err(401, "Invalid, revoked or expired API key", "authentication_error");
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return err(400, "Body must be JSON");
  if (!auth) {
    if (!getModel(String(body.model))?.free) return err(401, "Send an API key, or connect a wallet", "authentication_error");
    if ((await useTrial(false)) !== "ok") return err(402, "Free prompts are used up. Connect a wallet to keep going.", "trial_exhausted");
  }
  return handleChat(req, { auth, source: auth?.key ? "api" : auth ? "app" : "trial" }, body);
}
