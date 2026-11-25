import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NVIDIA_API_KEY = "test-key";
const { buildUpstreamBody } = await import("./upstream.ts");
const { chatRequest } = await import("./nvidia.ts");
const { MODELS } = await import("./models.ts");

test("only allow-listed fields reach the model host; identifying ones are dropped", () => {
  const m = MODELS.find((x) => x.kind === "chat")!;
  const messages = [{ role: "user" as const, content: "hi" }];
  const sent = { model: m.id, messages, temperature: 0.2, user: "0xWALLET", metadata: { ip: "203.0.113.9" }, wallet: "0xabc", ip: "198.51.100.7" };
  const body = buildUpstreamBody(m, sent, messages, 100) as Record<string, unknown>;
  assert.deepEqual(Object.keys(body).sort(), ["max_tokens", "messages", "model", "stream", "temperature"]);
  assert.equal(body.model, m.upstream);
  assert.ok(!JSON.stringify(body).includes("0xWALLET") && !JSON.stringify(body).includes("203.0.113.9"));
});

test("the upstream request carries only the pooled key and a fixed user agent", () => {
  const r = chatRequest({ model: "x", messages: [] });
  assert.deepEqual(Object.keys(r.headers).sort(), ["Accept", "Authorization", "Content-Type", "User-Agent"]);
  assert.equal(r.headers["User-Agent"], "wisp");
  assert.equal(r.headers.Authorization, "Bearer test-key");
});
