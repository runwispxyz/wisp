import { adminLogin } from "@/lib/admin";
import { err } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const r = await adminLogin(req, String(password || ""));
  if (r === "ok") return Response.json({ ok: true });
  if (r === "blocked") return err(429, "Too many wrong passwords. Try again in 15 minutes.");
  if (r === "unset") return err(503, "Admin password is not configured on the server (ADMIN_PASSWORD_HASH).");
  return err(401, "Wrong password");
}
