"use client";
import { useState } from "react";
import { Mark } from "@/components/Logo";
import { DotScene } from "./DotScene";
import s from "./site.module.css";

// Sample screens drawn in HTML, not screenshots.
function Side({ on }: { on: string }) {
  return (
    <div className={s.appSide}>
      <b><Mark size={14} />wisp chat</b>
      <span>Search chats</span>
      <span className={s.on}>+ New chat</span>
      <span className={on === "chat" ? s.on : ""}>Regex for ISO dates</span>
      <span className={on === "image" ? s.on : ""}>Lantern over a lake</span>
      <span>Weekly notes</span>
      <span style={{ marginTop: 40, border: 0, padding: 0, color: "var(--text-3)" }}>Balance</span>
      <b style={{ fontSize: 18, fontWeight: 400 }}>$14.80</b>
    </div>
  );
}

const SCREENS = [
  {
    k: "image", label: "Image studio", chip: "priced before it runs",
    body: (
      <div className={s.app}><Side on="image" />
        <div className={s.appMain}>
          <div className={s.bub}>A paper lantern drifting over a still lake at night</div>
          <div className={s.studio}>{[0, 1, 2].map((i) => <span key={i}><DotScene scene={i === 1 ? "orb" : "wave"} tint="--kind-image" solid /></span>)}</div>
          <div className={s.rec}><span>FLUX.1 schnell</span><span>$0.003 an image</span><span>list $0.006</span></div>
        </div>
      </div>
    ),
  },
  {
    k: "chat", label: "Chat", chip: "charged $0.0003, list $0.0006",
    body: (
      <div className={s.app}><Side on="chat" />
        <div className={s.appMain}>
          <div className={s.bub}>Write a regex for ISO dates.</div>
          <div className={s.ans}>
            <span>Here is one that matches YYYY-MM-DD:</span>
            <code>{"^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$"}</code>
            <span>It checks the month and day ranges but not leap years.</span>
          </div>
          <div className={s.rec}><span>Nemotron 3.5 Lightning</span><span>$0.0003</span><span><s>$0.0006</s></span><span>212 tokens</span></div>
        </div>
      </div>
    ),
  },
  {
    k: "privacy", label: "Privacy record", chip: "wallet, IP and device removed",
    body: (
      <div className={s.app}><Side on="" />
        <div className={s.appMain}>
          <b style={{ color: "var(--text)", fontSize: 14, fontWeight: 400 }}>What reached the model</b>
          {["wallet address", "IP address", "user agent", "device details"].map((f) => <div key={f} className={s.privRow}><s>{f}</s><span>removed</span></div>)}
          <div className={s.privRow}><span style={{ color: "var(--text)" }}>your question</span><span style={{ color: "var(--accent)" }}>sent, not kept</span></div>
          <div className={s.privRow}><span>billing row</span><span>model, tokens, cost · 30 days</span></div>
        </div>
      </div>
    ),
  },
];

export function Showcase() {
  const [front, setFront] = useState(1);
  const pos = (i: number) => (i === front ? s.front : i === (front + 2) % 3 ? s.left : s.rightC);
  return (
    <>
      <div className={s.fan}>
        {SCREENS.map((x, i) => (
          <figure key={x.k} className={`${s.fanCard} ${pos(i)}`}>
            <button className={s.hit} tabIndex={i === front ? -1 : 0} aria-label={`Show ${x.label}`} onClick={() => setFront(i)} />
            <figcaption className={s.chrome}>{x.label}</figcaption>
            <div className={s.screen}>{x.body}<span className={s.shotChip}><i />{x.chip}</span></div>
          </figure>
        ))}
      </div>
      <div className={s.fanFoot}>
        <div className={s.seg3} role="group" aria-label="Screens">
          {SCREENS.map((x, i) => <button key={x.k} className={s.segB} aria-pressed={i === front} onClick={() => setFront(i)}>{x.label}</button>)}
        </div>
      </div>
    </>
  );
}
