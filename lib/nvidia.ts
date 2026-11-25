// Upstream provider. Requests leave under one pooled key with no client IP, user agent or wallet attached.
const BASE = "https://integrate.api.nvidia.com/v1";
const GENAI = "https://ai.api.nvidia.com/v1/genai";
const headers = () => ({
  Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "wisp",
});

export function upstreamChat(body: Record<string, unknown>, signal?: AbortSignal) {
  return fetch(`${BASE}/chat/completions`, { method: "POST", headers: headers(), body: JSON.stringify(body), signal });
}

export async function upstreamImage(model: string, prompt: string): Promise<Buffer> {
  const r = await fetch(`${GENAI}/${model}`, { method: "POST", headers: headers(), body: JSON.stringify({ prompt }) });
  if (!r.ok) throw new Error(`image provider ${r.status}`);
  const j = (await r.json()) as { artifacts?: { base64: string; finishReason?: string }[] };
  const a = j.artifacts?.[0];
  if (!a?.base64) throw new Error("image provider returned nothing");
  if (a.finishReason === "CONTENT_FILTERED") throw new Error("The image host's own safety filter blocked this prompt. Nothing was charged; try rewording it.");
  return Buffer.from(a.base64, "base64");
}

export async function upstreamOk() {
  try {
    const r = await fetch(`${BASE}/models`, { headers: headers(), signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch {
    return false;
  }
}
