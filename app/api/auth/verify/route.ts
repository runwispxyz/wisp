import { cookies } from "next/headers";
import { verifyMessage, type Hex } from "viem";
import { parseSiweMessage } from "viem/siwe";
import { createSession, isHttps, upsertAccount, useNonce, err, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const { message, signature } = (await req.json().catch(() => ({}))) as { message?: string; signature?: Hex };
  if (!message || !signature) return err(400, "message and signature are required");
  const f = parseSiweMessage(message);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!f.address || !f.nonce) return err(400, "Not a sign-in message");
  if (f.domain !== host) return err(400, "Message was made for another site");
  if (f.chainId !== Number(process.env.CHAIN_ID || 4663)) return err(400, "Wrong chain id");
  if (f.expirationTime && f.expirationTime.getTime() < Date.now()) return err(400, "Message expired");
  // shortcut: EOA signatures only; smart-contract wallets (EIP-1271) need verifySiweMessage with a chain client.
  const ok = await verifyMessage({ address: f.address, message, signature }).catch(() => false);
  if (!ok) return err(401, "Signature does not match the address");
  if (!useNonce(f.nonce)) return err(401, "Nonce expired or already used");
  const account = upsertAccount(f.address);
  const token = createSession(account.id);
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: isHttps(req), path: "/", maxAge: 86400 });
  return Response.json({ ok: true, address: account.address });
}
