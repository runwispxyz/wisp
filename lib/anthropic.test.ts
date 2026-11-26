import { test } from "node:test";
import assert from "node:assert/strict";
import { claudeParams } from "./anthropic.ts";

test("Claude gets the messages, a system prompt and low effort, and nothing else from the caller", () => {
  const p = claudeParams("anthropic:claude-haiku-5-5", {
    max_tokens: 300,
    messages: [
      { role: "system", content: "Be brief." },
      { role: "user", content: [{ type: "text", text: "hi" }, { type: "image_url", text: "ignored" }] },
      { role: "assistant", content: "hello" },
      { role: "tool", content: "dropped" },
    ],
  });
  assert.deepEqual(Object.keys(p).sort(), ["max_tokens", "messages", "model", "output_config", "system"]);
  assert.equal(p.model, "claude-haiku-5-5");
  assert.equal(p.system, "Be brief.");
  assert.deepEqual(p.output_config, { effort: "low" });
  assert.deepEqual(p.messages, [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }]);
});

test("a conversation that starts with the assistant gets an empty user turn first", () => {
  const p = claudeParams("anthropic:claude-haiku-5-5", { messages: [{ role: "assistant", content: "hey" }] });
  assert.equal(p.messages[0].role, "user");
});
