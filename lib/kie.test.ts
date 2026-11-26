import { test } from "node:test";
import assert from "node:assert/strict";
import { kieTask, resultUrl } from "./kie.ts";

test("result URL comes from resultUrls (image, video) or the first Suno track", () => {
  assert.equal(resultUrl(JSON.stringify({ resultUrls: ["https://x/a.png"] })), "https://x/a.png");
  assert.equal(resultUrl(JSON.stringify({ code: 200, data: [{ audio_url: "https://x/1.mp3" }, { audio_url: "https://x/2.mp3" }] })), "https://x/1.mp3");
  assert.equal(resultUrl(undefined), null);
});

test("tasks carry only the prompt and fixed settings, never anything about the caller", () => {
  const v = kieTask("kie:bytedance/seedance-2-fast", "a forest", 6);
  assert.deepEqual(Object.keys(v), ["model", "input"]);
  assert.equal(v.model, "bytedance/seedance-2-fast");
  assert.equal((v.input as { duration: number }).duration, 6);
  assert.equal((kieTask("kie:z-image", "x".repeat(2000), 1).input as { prompt: string }).prompt.length, 1000);
  assert.throws(() => kieTask("kie:unknown", "x", 1));
});
