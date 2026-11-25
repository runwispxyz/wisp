import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Format: scrypt:<salt hex>:<hash hex> (no "$": .env files expand it). Only this hash is stored (ADMIN_PASSWORD_HASH), never the password.
export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString("hex")}:${scryptSync(pw, salt, 32).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string | undefined) {
  const [kind, salt, hash] = (stored || "").split(":");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "hex");
  const got = scryptSync(pw, Buffer.from(salt, "hex"), want.length);
  return want.length === got.length && timingSafeEqual(want, got);
}
