// Tiny markdown parser for model output. Pure (no React, no DOM) so it can be unit-tested with node.
// It only produces a tree of plain strings; the renderer turns them into React text nodes, so HTML is never interpreted.

export type Inline =
  | { t: "text"; v: string }
  | { t: "code"; v: string }
  | { t: "b"; c: Inline[] }
  | { t: "i"; c: Inline[] }
  | { t: "a"; href: string; c: Inline[] };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; level: number; c: Inline[] }
  | { t: "code"; lang: string; v: string }
  | { t: "ul" | "ol"; items: Inline[][]; start?: number }
  | { t: "quote"; c: Inline[] }
  | { t: "hr" };

/** Only http(s) and mailto links are kept; anything else (javascript:, data:, ...) renders as plain text. */
export const safeHref = (u: string) => (/^(https?:\/\/|mailto:)/i.test(u.trim()) ? u.trim() : null);

const INLINE = /`([^`\n]+)`|\*\*([^*]+?)\*\*|\*([^*\s](?:[^*]*?[^*\s])?)\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  const text = (v: string) => { if (v) out.push({ t: "text", v }); };
  for (const m of s.matchAll(INLINE)) {
    text(s.slice(last, m.index));
    last = m.index! + m[0].length;
    if (m[1] !== undefined) out.push({ t: "code", v: m[1] });
    else if (m[2] !== undefined) out.push({ t: "b", c: parseInline(m[2]) });
    else if (m[3] !== undefined) out.push({ t: "i", c: parseInline(m[3]) });
    else {
      const href = safeHref(m[5]);
      if (href) out.push({ t: "a", href, c: parseInline(m[4]) });
      else text(m[0]);
    }
  }
  text(s.slice(last));
  return out;
}

const FENCE = /^\s*(```+|~~~+)\s*([\w+#.-]*)/;
const UL = /^\s*[-*+]\s+(.*)$/;
const OL = /^\s*(\d+)[.)]\s+(.*)$/;
const HEAD = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s*([-*_])(\s*\1){2,}\s*$/;

export function parse(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ t: "p", c: parseInline(para.join("\n")) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const f = FENCE.exec(line);
    if (f) {
      flush();
      const body: string[] = [];
      // an unclosed fence (still streaming) runs to the end
      while (++i < lines.length && !lines[i].trim().startsWith(f[1])) body.push(lines[i]);
      out.push({ t: "code", lang: f[2], v: body.join("\n") });
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    if (HR.test(line)) { flush(); out.push({ t: "hr" }); continue; }
    const h = HEAD.exec(line);
    if (h) { flush(); out.push({ t: "h", level: h[1].length, c: parseInline(h[2]) }); continue; }
    if (line.startsWith(">")) {
      flush();
      const q = [line.replace(/^>\s?/, "")];
      while (i + 1 < lines.length && lines[i + 1].startsWith(">")) q.push(lines[++i].replace(/^>\s?/, ""));
      out.push({ t: "quote", c: parseInline(q.join("\n")) });
      continue;
    }
    const ul = UL.exec(line), ol = OL.exec(line);
    if ((ul && !HR.test(line)) || ol) {
      flush();
      const kind = ol ? "ol" : "ul";
      const re = ol ? OL : UL;
      const items: string[] = [];
      for (; i < lines.length; i++) {
        const m = re.exec(lines[i]);
        if (m) items.push(m[m.length - 1]);
        else if (lines[i].trim() && /^\s+/.test(lines[i]) && items.length) items[items.length - 1] += "\n" + lines[i].trim();
        else { i--; break; }
      }
      out.push({ t: kind, items: items.map(parseInline), ...(ol ? { start: Number(ol[1]) } : {}) });
      continue;
    }
    para.push(line);
  }
  flush();
  return out;
}
