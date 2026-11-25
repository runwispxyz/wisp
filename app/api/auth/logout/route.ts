import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sha, SESSION_COOKIE } from "@/lib/auth";
export async function POST() {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (t) db.prepare("delete from sessions where token_hash = ?").run(sha(t));
  jar.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
