// What the model host receives for a chat call. No imports beyond types, so tests can load it directly.
import type { Model } from "./models";

export type Msg = { role: string; content: unknown };
export const MAX_OUT = 8192;

export const maxOutOf = (body: Record<string, unknown>) => Math.min(Number(body.max_tokens ?? body.max_completion_tokens ?? 2048) || 2048, MAX_OUT);

/** Everything the model host gets in the body: an allow-list, so nothing else the caller sends is passed on. */
export function buildUpstreamBody(m: Model, body: Record<string, unknown>, messages: Msg[], maxOut: number) {
  const stream = body.stream === true;
  return {
    model: m.upstream,
    messages,
    max_tokens: maxOut,
    stream,
    ...(stream ? { stream_options: { include_usage: true } } : {}),
    ...pick(body, ["temperature", "top_p", "stop", "tools", "tool_choice", "response_format", "seed", "presence_penalty", "frequency_penalty"]),
  };
}

export function pick(o: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
}
