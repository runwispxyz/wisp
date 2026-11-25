import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, parseInline } from "./markdown.ts";

test("raw HTML stays plain text", () => {
  const b = parse("hi <script>alert(1)</script> <img src=x onerror=alert(1)>");
  assert.deepEqual(b, [{ t: "p", c: [{ t: "text", v: "hi <script>alert(1)</script> <img src=x onerror=alert(1)>" }] }]);
});

test("unsafe link schemes are not links", () => {
  assert.deepEqual(parseInline("[x](javascript:alert(1))").some((n) => n.t === "a"), false);
  assert.deepEqual(parseInline("[x](https://a.b/c)"), [{ t: "a", href: "https://a.b/c", c: [{ t: "text", v: "x" }] }]);
});

test("code fences parse, closed and still streaming", () => {
  assert.deepEqual(parse("a\n```ts\nconst x = '<b>';\n```\nb"), [
    { t: "p", c: [{ t: "text", v: "a" }] },
    { t: "code", lang: "ts", v: "const x = '<b>';" },
    { t: "p", c: [{ t: "text", v: "b" }] },
  ]);
  assert.deepEqual(parse("```py\nprint(1)"), [{ t: "code", lang: "py", v: "print(1)" }]);
});

test("inline, headings and lists", () => {
  assert.deepEqual(parseInline("**b** *i* `c`"), [
    { t: "b", c: [{ t: "text", v: "b" }] }, { t: "text", v: " " },
    { t: "i", c: [{ t: "text", v: "i" }] }, { t: "text", v: " " }, { t: "code", v: "c" },
  ]);
  const b = parse("# Title\n- one\n- two\n\n3. three\n4. four\n---");
  assert.equal(b[0].t, "h");
  assert.deepEqual(b[1], { t: "ul", items: [[{ t: "text", v: "one" }], [{ t: "text", v: "two" }]] });
  assert.deepEqual(b[2], { t: "ol", start: 3, items: [[{ t: "text", v: "three" }], [{ t: "text", v: "four" }]] });
  assert.deepEqual(b[3], { t: "hr" });
});
