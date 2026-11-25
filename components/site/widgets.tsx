"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HAS_LIST, LIVE_KINDS, MODELS, chatCost, mediaCost, type Model } from "@/lib/models";
import { DotScene } from "./DotScene";
import { Icon } from "./icons";
import { MakerMark, kindVar } from "./parts";
import s from "./site.module.css";

export function CopyButton({ text, label = "Copy", disabled }: { text: string; label?: string; disabled?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-sm"
      disabled={disabled}
      onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); }, () => {})}
    >
      {done ? "Copied" : label}
    </button>
  );
}

/** Seconds left to the next top of the hour (null before mount, so server and client render the same). */
function useLeft() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now == null) return null;
  const next = new Date(now);
  next.setMinutes(60, 0, 0);
  return { left: Math.max(0, Math.floor((next.getTime() - now) / 1000)), at: next };
}
const mmss = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** Time left to the next top of the hour, when Holder Credit is swept. */
export function Countdown({ big, bare }: { big?: boolean; bare?: boolean }) {
  const t = useLeft();
  if (!t) return <span className={big ? s.clock : "mono"}>--:--</span>;
  const label = `${Math.floor(t.left / 60)} minutes ${t.left % 60} seconds to the next sweep`;
  if (bare) return <span className={s.clock} aria-label={label}>{mmss(t.left)}</span>;
  return (
    <span>
      <span className={big ? s.clock : "mono accent"} style={big ? { fontSize: 44, letterSpacing: "-0.03em" } : undefined} aria-label={label}>{mmss(t.left)}</span>
      <span className="faint mono" style={{ fontSize: 12, marginLeft: 8 }}>next sweep {t.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
    </span>
  );
}

/** 60 cells for the hour: gone, the current minute, still to come. */
export function HourDots() {
  const t = useLeft();
  const gone = t ? 60 - Math.ceil(t.left / 60) : 0;
  return (
    <span className={s.hour} aria-hidden>
      {Array.from({ length: 60 }, (_, i) => <i key={i} className={i < gone ? s.gone : i === gone && t ? s.hNow : ""} />)}
    </span>
  );
}

const REPLY = { in: 2000, out: 500 };
/** How many units `dollars` buys of model m: replies (2k in / 500 out) for chat, else images/seconds/songs. */
export function unitsFor(m: Model, dollars: number, list = false) {
  const micro = m.kind === "chat" ? chatCost(m, REPLY.in, REPLY.out, list) : mediaCost(m, 1, list);
  if (!micro) return null;
  return Math.floor((dollars * 1e6) / micro);
}
export const unitName = (m: Model) => (m.kind === "chat" ? "replies" : m.unit === "second" ? "seconds of video" : m.unit + "s");
const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-US"));

function Amounts({ amounts, value, onChange }: { amounts: number[]; value: number; onChange: (n: number) => void }) {
  return (
    <div className={s.amt} role="group" aria-label="Amount">
      {amounts.map((a) => (
        <button key={a} className={s.amtB} aria-pressed={a === value} onClick={() => onChange(a)}>${a}</button>
      ))}
    </div>
  );
}

/** Short list: one model per kind. */
export function WhatBuys({ amounts = [1, 10, 50] }: { amounts?: number[] }) {
  const [amt, setAmt] = useState(amounts[1] ?? amounts[0]);
  const picks = LIVE_KINDS.map((k) => MODELS.find((m) => m.kind === k)).filter((m): m is Model => !!m);
  return (
    <div className={s.buys}>
      <div className={s.buysHead}><p className={s.buysTitle}>What ${amt} of Holder Credit buys</p><Amounts amounts={amounts} value={amt} onChange={setAmt} /></div>
      <ul className={s.bTiles}>
        {picks.map((m) => (
          <li key={m.id} className={s.bTile} style={kindVar(m.kind)}>
            <span className={s.bKind}><MakerMark name={m.maker} size={18} />{m.name}</span>
            <span key={amt} className={s.bCount}>{fmt(unitsFor(m, amt))}</span>
            <span className={s.what}>{unitName(m)}<em>{m.kind === "chat" ? "2,000 tokens in, 500 out each" : `billed per ${m.unit}`}</em></span>
          </li>
        ))}
      </ul>
      <div className={s.buysFoot}><Link href="/token#holder-credit" className={s.link}>How Holder Credit works <Icon name="arrow" size={12} /></Link></div>
    </div>
  );
}

/** Full table: every model, units on Wisp vs at list price. */
export function BuysTable({ amounts = [1, 10, 50, 100, 500] }: { amounts?: number[] }) {
  const [amt, setAmt] = useState(10);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Amounts amounts={amounts} value={amt} onChange={setAmt} />
      <div className={`card ${s.tableWrap}`}>
        <table className="t">
          <thead><tr><th>Model</th><th>Kind</th><th style={{ textAlign: "right" }}>On Wisp</th>{HAS_LIST && <th style={{ textAlign: "right" }}>At list price</th>}<th>Unit</th></tr></thead>
          <tbody>
            {MODELS.map((m) => {
              const w = unitsFor(m, amt), l = unitsFor(m, amt, true);
              return (
                <tr key={m.id}>
                  <td>{m.name}<br /><small className="faint">{m.maker}</small></td>
                  <td className="faint">{m.kind}</td>
                  <td className="mono tabnum up" style={{ textAlign: "right" }}>{fmt(w)}</td>
                  {HAS_LIST && <td className="mono tabnum faint" style={{ textAlign: "right" }}>{l == null ? "no list price" : fmt(l)}</td>}
                  <td className="faint">{unitName(m)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="faint" style={{ fontSize: 13, margin: 0 }}>A chat reply here means 2,000 tokens in and 500 out. Images are counted one per image.</p>
    </div>
  );
}

const PHASES = ["Signed in", "Identity removed", "Answered", "Settled"];
const CHIPS: [string, string][][] = [
  [["Wallet", "0x8f…4c2, kept as a hash"], ["Session", "one signature, no email"]],
  [["Removed", "wallet, IP address, user agent"], ["Shared key", "the host sees Wisp"]],
  [["Answer", "streamed back to you"], ["Content", "no copy kept"]],
  [["Held", "$0.020 worst case"], ["Charged", "$0.0014, the rest released"]],
];
/** You → Wisp → model, cycling through the four phases of one request. */
export function HowItWorks({ model = "nemotron-3.5-lightning" }: { model?: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % PHASES.length), 2400);
    return () => clearInterval(t);
  }, [paused]);
  const [a, b] = CHIPS[i];
  return (
    <div className={s.window}>
      <div className={s.stage}>
        <div className={s.stageArt}><DotScene scene="portal" /></div>
        <span className={s.req}><i />request · {model}<span className={s.barTag}>private</span></span>
        <div key={"a" + i} className={`${s.hChip} ${s.chipA}`}><b>{a[0]}</b>{a[1]}</div>
        <div key={"b" + i} className={`${s.hChip} ${s.chipB}`}><b>{b[0]}</b>{b[1]}</div>
        <ul className={s.stations}>
          <li className={`${s.station} ${s.stYou}`}><b>You</b><span>your wallet and IP go no further than Wisp</span></li>
          <li className={`${s.station} ${s.stWisp}`}><b>Wisp</b><span>your identity comes off here</span></li>
          <li className={`${s.station} ${s.stModel}`}><b>AI model</b><span>sees Wisp, not you</span></li>
        </ul>
      </div>
      <div className={s.hStatus}>
        <span className={s.flags}>
          <span>Content logging<span className={s.onTag}>off</span></span><span className={s.sep} aria-hidden>·</span>
          <span>Identity forwarding<span className={s.onTag}>off</span></span>
        </span>
        <span style={{ display: "inline-flex", flexWrap: "wrap" }}>
          <span className={s.hSteps} role="group" aria-label="Steps of one request">
            {PHASES.map((p, n) => (
              <button key={p} className={`${s.stepBtn} ${n === i ? s.stepOn : ""}`} aria-pressed={n === i} onClick={() => { setI(n); setPaused(true); }}>
                <span className={s.stepNum}>{n + 1}</span><span className={s.stepName}>{p}</span>
                <span className={s.stepBar}><i key={i} className={!paused ? s.run : ""} /></span>
              </button>
            ))}
          </span>
          <button className={s.hold} onClick={() => setPaused(!paused)} aria-pressed={paused}><i className={s.pip} />{paused ? "Play" : "Pause"}</button>
        </span>
      </div>
    </div>
  );
}

