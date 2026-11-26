import { err } from "@/lib/auth";
import { buildUpstreamBody, maxOutOf } from "@/lib/upstream";
import { chatRequest } from "@/lib/nvidia";
import { getModel } from "@/lib/models";
import { claudeParams } from "@/lib/anthropic";

/**
 * Public preview of the identity stripping: send the same body (and any headers) you would send to
 * /v1/chat/completions, and get back the exact request Wisp would forward to the model host, built by
 * the same code as a real call. Nothing is sent upstream, nothing is charged, nothing is stored.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return err(400, "Body must be JSON");
  const m = getModel(String(body.model || ""));
  if (!m || m.kind !== "chat") return err(404, `Unknown chat model ${body.model}`, "model_not_found");
  if (!Array.isArray(body.messages) || !body.messages.length) return err(400, "messages is required");

  const built = buildUpstreamBody(m, body, body.messages, maxOutOf(body));
  const out = m.upstream.startsWith("anthropic:")
    ? { url: "https://api.anthropic.com/v1/messages", headers: { "x-api-key": "<Wisp's Anthropic key, the same for every user>", "Content-Type": "application/json", "anthropic-version": "(set by the official SDK)" } as Record<string, string>, body: claudeParams(m.upstream, built as never) }
    : chatRequest(built);
  const h = req.headers;
  return Response.json(
    {
      // what reached Wisp: shown so you can compare it with what leaves
      received_by_wisp: {
        ip: h.get("x-forwarded-for")?.split(",")[0].trim() || null,
        user_agent: h.get("user-agent"),
        authorization: h.get("authorization") ? "present (your key)" : null,
        cookies: (h.get("cookie") || "").split(";").map((c) => c.split("=")[0].trim()).filter(Boolean),
        body_fields: Object.keys(body),
      },
      // what would leave Wisp for the model host, byte for byte except the masked pooled key
      sent_to_model_host: {
        url: out.url,
        headers: "Authorization" in out.headers ? { ...out.headers, Authorization: "Bearer <Wisp's pooled key, the same for every user>" } : out.headers,
        body: out.body,
      },
      note: m.upstream.startsWith("anthropic:")
        ? "Built by the same function as a real call (lib/upstream.ts buildUpstreamBody, lib/anthropic.ts claudeParams) at the build shown in /api/status. The official Anthropic SDK sends it, adding its own headers about Wisp's server (SDK version, runtime), nothing about you. Nothing was sent upstream, charged or stored."
        : "Built by the same function as a real call (lib/upstream.ts buildUpstreamBody, lib/nvidia.ts chatRequest) at the build shown in /api/status. Nothing was sent upstream, charged or stored.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
