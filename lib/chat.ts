import { getModel, chatCost, type Model } from "./models";
import { hold, settle, type Hold } from "./billing";
import { err, keyBlocks, type Auth } from "./auth";
import { upstreamChat } from "./nvidia";
import { claudeChat } from "./anthropic";
import { buildUpstreamBody, maxOutOf, pick, type Msg } from "./upstream";

/** ~4 chars per token; images count as 1k tokens. Used only for the hold, never the charge when usage comes back. */
export function estimateTokens(messages: Msg[]) {
  let chars = 0;
  for (const m of messages) {
    if (typeof m.content === "string") chars += m.content.length;
    else if (Array.isArray(m.content))
      for (const p of m.content as { type: string; text?: string }[]) chars += p.type === "text" ? (p.text || "").length : 4000;
  }
  return Math.ceil(chars / 4) + 8 * messages.length;
}

export type ChatCaller = { auth: Auth | null; source: string };

/**
 * OpenAI-compatible chat completion with hold → stream → settle.
 * Free-trial callers (auth null) are billed to nobody but still logged as a call.
 */
export async function handleChat(req: Request, caller: ChatCaller, body: Record<string, unknown>): Promise<Response> {
  const m = getModel(String(body.model || ""));
  if (!m || m.kind !== "chat") return err(404, `Unknown chat model ${body.model}`, "model_not_found");
  if (!caller.auth && !m.free) return err(401, "Connect a wallet to use this model");
  const messages = body.messages as Msg[] | undefined;
  if (!Array.isArray(messages) || !messages.length) return err(400, "messages is required");

  const maxOut = maxOutOf(body);
  const estIn = estimateTokens(messages);
  const worst = chatCost(m, estIn * 1.2, maxOut)!;
  const block = keyBlocks(caller.auth?.key, m, worst);
  if (block) return err(403, block, "permission_error");
  const h = hold({ accountId: caller.auth?.account.id ?? null, keyId: caller.auth?.key?.id, model: m.id, kind: "chat", amount: worst, source: caller.source });
  if (!h) return err(402, "Balance too low for this call's hold. Top up and try again.", "insufficient_balance");

  const stream = body.stream === true;
  const upstreamBody = buildUpstreamBody(m, body, messages, maxOut);

  let up: Response;
  try {
    up = m.upstream.startsWith("anthropic:") ? await claudeChat(m.upstream, upstreamBody, req.signal) : await upstreamChat(upstreamBody, req.signal);
  } catch {
    settle(h, { cost: 0, listCost: null, failed: true });
    return err(502, "The model host did not answer", "upstream_error");
  }
  if (!up.ok || !up.body) {
    settle(h, { cost: 0, listCost: null, failed: true });
    const text = await up.text().catch(() => "");
    return err(up.status === 429 ? 429 : 502, `The model host refused the call (${up.status}) ${text.slice(0, 200)}`, "upstream_error");
  }

  if (!stream) {
    const j = (await up.json()) as { usage?: { prompt_tokens: number; completion_tokens: number }; [k: string]: unknown };
    const r = receipt(m, h, j.usage?.prompt_tokens ?? estIn, j.usage?.completion_tokens ?? 0);
    return Response.json(clean(j, m), { headers: receiptHeaders(r) });
  }

  // Stream: rewrite each chunk (our model id, no host fields), watch usage, settle at the end.
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buf = "";
  let usage: { prompt_tokens: number; completion_tokens: number } | undefined;
  let outChars = 0;
  let settled = false;
  const finish = (failed = false) => {
    if (settled) return null;
    settled = true;
    if (failed && outChars === 0) {
      settle(h, { cost: 0, listCost: null, failed: true });
      return null;
    }
    return receipt(m, h, usage?.prompt_tokens ?? estIn, usage?.completion_tokens ?? Math.ceil(outChars / 4));
  };

  const out = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const reader = up.body!.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const j = JSON.parse(data);
              if (j.usage) usage = j.usage;
              for (const c of j.choices ?? []) outChars += (c.delta?.content?.length ?? 0) + (c.delta?.reasoning_content?.length ?? 0);
              ctrl.enqueue(enc.encode(`data: ${JSON.stringify(clean(j, m))}\n\n`));
            } catch {
              /* skip malformed chunk */
            }
          }
        }
        const r = finish();
        // SSE comment: OpenAI SDKs ignore it, our own clients read the receipt from it.
        if (r) ctrl.enqueue(enc.encode(`: receipt ${JSON.stringify(r)}\n\n`));
        ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
        ctrl.close();
      } catch {
        finish(true);
        try { ctrl.close(); } catch {}
      }
    },
    cancel() {
      finish(true); // client left: charge only what arrived
    },
  });
  return new Response(out, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "X-Wisp-Held": String(h.held / 1e6) } });
}

function receipt(m: Model, h: Hold, tokIn: number, tokOut: number) {
  const cost = chatCost(m, tokIn, tokOut)!;
  const listCost = chatCost(m, tokIn, tokOut, true);
  const charged = settle(h, { cost, listCost, tokIn, tokOut });
  return { model: m.id, tokens_in: tokIn, tokens_out: tokOut, held: h.held / 1e6, charged: charged / 1e6, list: listCost == null ? null : listCost / 1e6, removed: ["wallet", "ip", "user_agent"], kept: "billing row only" };
}
const receiptHeaders = (r: ReturnType<typeof receipt>) => ({
  "X-Wisp-Charged": String(r.charged),
  "X-Wisp-List": String(r.list ?? ""),
  "X-Wisp-Held": String(r.held),
});

function clean(j: Record<string, unknown>, m: Model) {
  const { system_fingerprint, nvext, ...rest } = j as Record<string, unknown> & { system_fingerprint?: unknown; nvext?: unknown };
  void system_fingerprint; void nvext;
  return { ...rest, model: m.id };
}
