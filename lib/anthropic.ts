// Claude models through the official Anthropic SDK. Server only: it reads ANTHROPIC_API_KEY.
// Wisp speaks the OpenAI format to callers, so this converts the allow-listed upstream body
// (lib/upstream.ts) into a Messages API request, and Claude's answer back into OpenAI chunks.
import Anthropic from "@anthropic-ai/sdk";

type OpenAIMsg = { role: string; content: unknown };
const MAX_IN = 95_000; // Haiku 5.5 is priced higher past 100K prompt tokens; Wisp keeps calls under that

const textOf = (c: unknown): string =>
  typeof c === "string" ? c : Array.isArray(c) ? c.filter((p: { type?: string }) => p.type === "text").map((p: { text?: string }) => p.text ?? "").join("\n") : "";

/**
 * The exact Messages API body Wisp sends for a call: model, system, messages, max_tokens and low effort.
 * Pure, so /v1/outgoing can show it. Sampling settings are dropped: Claude Haiku 5.5 rejects non-default values.
 */
export function claudeParams(upstreamModel: string, body: { messages?: OpenAIMsg[]; max_tokens?: number }) {
  const msgs = body.messages ?? [];
  const system = msgs.filter((m) => m.role === "system").map((m) => textOf(m.content)).filter(Boolean).join("\n\n");
  const messages: Anthropic.MessageParam[] = msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: textOf(m.content) || " " }));
  if (messages[0]?.role !== "user") messages.unshift({ role: "user", content: " " }); // the first turn must be the user's
  return {
    model: upstreamModel.replace(/^anthropic:/, ""),
    max_tokens: body.max_tokens ?? 2048,
    output_config: { effort: "low" as const }, // the cheapest setting: least thinking per answer
    ...(system ? { system } : {}),
    messages,
  };
}

const FINISH: Record<string, string> = { end_turn: "stop", stop_sequence: "stop", max_tokens: "length", refusal: "content_filter" };
const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;

/** Calls Claude and returns an OpenAI-format Response (SSE when body.stream), so lib/chat.ts handles it like any host. */
export async function claudeChat(upstreamModel: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  const params = claudeParams(upstreamModel, body as { messages?: OpenAIMsg[]; max_tokens?: number });
  const chars = (params.system?.length ?? 0) + params.messages.reduce((n, m) => n + String(m.content).length, 0);
  if (chars / 4 > MAX_IN) return new Response(`This model takes up to ${MAX_IN.toLocaleString()} input tokens on Wisp.`, { status: 400 });
  const client = new Anthropic(); // ANTHROPIC_API_KEY from the server env
  const id = "chatcmpl-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const created = Math.floor(Date.now() / 1000);
  const base = { id, object: "chat.completion.chunk", created, model: params.model };

  try {
    if (body.stream !== true) {
      const r = await client.messages.create(params, { signal });
      const text = r.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const inTok = r.usage.input_tokens + (r.usage.cache_read_input_tokens ?? 0) + (r.usage.cache_creation_input_tokens ?? 0);
      return Response.json({
        id, object: "chat.completion", created, model: params.model,
        choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: FINISH[r.stop_reason ?? ""] ?? "stop" }],
        usage: { prompt_tokens: inTok, completion_tokens: r.usage.output_tokens, total_tokens: inTok + r.usage.output_tokens },
      });
    }
    const events = await client.messages.create({ ...params, stream: true }, { signal });
    const enc = new TextEncoder();
    const out = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        let inTok = 0, outTok = 0, finish = "stop";
        ctrl.enqueue(enc.encode(sse({ ...base, choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }] })));
        try {
          for await (const e of events) {
            if (e.type === "message_start") inTok = e.message.usage.input_tokens + (e.message.usage.cache_read_input_tokens ?? 0) + (e.message.usage.cache_creation_input_tokens ?? 0);
            else if (e.type === "content_block_delta" && e.delta.type === "text_delta")
              ctrl.enqueue(enc.encode(sse({ ...base, choices: [{ index: 0, delta: { content: e.delta.text }, finish_reason: null }] })));
            else if (e.type === "message_delta") {
              outTok = e.usage.output_tokens; // includes thinking tokens, which are billed as output
              finish = FINISH[e.delta.stop_reason ?? ""] ?? "stop";
            }
          }
          ctrl.enqueue(enc.encode(sse({ ...base, choices: [{ index: 0, delta: {}, finish_reason: finish }] })));
          ctrl.enqueue(enc.encode(sse({ ...base, choices: [], usage: { prompt_tokens: inTok, completion_tokens: outTok, total_tokens: inTok + outTok } })));
          ctrl.enqueue(enc.encode("data: [DONE]\n\n"));
          ctrl.close();
        } catch (e) {
          ctrl.error(e); // lib/chat.ts settles on what already arrived
        }
      },
    });
    return new Response(out, { headers: { "Content-Type": "text/event-stream" } });
  } catch (e) {
    // most specific first; lib/chat.ts turns any non-2xx into a failed call with nothing charged
    if (e instanceof Anthropic.RateLimitError) return new Response("Claude is rate limited right now", { status: 429 });
    if (e instanceof Anthropic.APIError) return new Response(e.message.slice(0, 200), { status: e.status && e.status >= 400 ? e.status : 502 });
    throw e; // network failure: lib/chat.ts reports "did not answer"
  }
}
