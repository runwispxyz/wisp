"use client";
import { useMemo, useState } from "react";
import { parse, type Inline } from "./markdown";
import s from "./chat.module.css";

function Inl({ n }: { n: Inline[] }) {
  return n.map((x, i) =>
    x.t === "text" ? <span key={i}>{x.v}</span>
    : x.t === "code" ? <code key={i}>{x.v}</code>
    : x.t === "b" ? <strong key={i}><Inl n={x.c} /></strong>
    : x.t === "i" ? <em key={i}><Inl n={x.c} /></em>
    : <a key={i} href={x.href} target="_blank" rel="noopener noreferrer nofollow"><Inl n={x.c} /></a>,
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={s.icon} style={{ width: "auto", padding: "0 6px", fontSize: 12 }}
      onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); })}>
      {done ? "Copied" : label}
    </button>
  );
}

/** Renders model output. Everything ends up as React text nodes; no HTML from the model is ever interpreted. */
export function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => parse(text), [text]);
  return (
    <div className={s.md}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p": return <p key={i}><Inl n={b.c} /></p>;
          case "h": { const H = `h${b.level}` as "h1"; return <H key={i}><Inl n={b.c} /></H>; }
          case "quote": return <blockquote key={i}><Inl n={b.c} /></blockquote>;
          case "hr": return <hr key={i} />;
          case "ul": return <ul key={i}>{b.items.map((it, j) => <li key={j}><Inl n={it} /></li>)}</ul>;
          case "ol": return <ol key={i} start={b.start}>{b.items.map((it, j) => <li key={j}><Inl n={it} /></li>)}</ol>;
          case "code":
            return (
              <div key={i} className={s.pre}>
                <div className={s.preHead}><span>{b.lang || "code"}</span><CopyButton text={b.v} /></div>
                <pre><code>{b.v}</code></pre>
              </div>
            );
        }
      })}
    </div>
  );
}
