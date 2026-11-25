"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_CHAT, MODELS, SHOWN_KINDS, chatCost, fromMicro, getModel, isSoon, mediaCost, usd, type Kind } from "@/lib/models";
import { streamChat, type Receipt } from "@/lib/client";
import { Icon } from "./icons";
import { KIND_ICON, MakerMark, cap, kindVar } from "./parts";
import s from "./site.module.css";

const KINDS: Kind[] = SHOWN_KINDS;
const HINT: Record<Kind, string> = { chat: "Ask anything, anonymously", image: "Describe an image", video: "Describe a short clip", music: "Describe a song" };
const UNIT: Record<Kind, string> = { chat: "for a 500-token reply", image: "per image", video: "for an 8-second clip", music: "per song" };

export function AskBox() {
  const [kind, setKind] = useState<Kind>("chat");
  const [model, setModel] = useState(DEFAULT_CHAT);
  const [q, setQ] = useState("");
  const [out, setOut] = useState("");
  const [think, setThink] = useState(""); // reasoning text, shown dimmed until the answer starts
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rec, setRec] = useState<Receipt | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => {
    fetch("/api/trial").catch(() => {}); // issues the free-trial cookie before the first send
    return () => ctrl.current?.abort();
  }, []);

  const soon = isSoon(kind);
  const list = MODELS.filter((m) => m.kind === kind);
  const m = soon ? getModel(DEFAULT_CHAT)! : getModel(model) ?? list[0];
  const n = kind === "video" ? 8 : 1;
  const est = soon ? null : kind === "chat" ? chatCost(m, 60, 500) : mediaCost(m, n);
  const estList = soon ? null : kind === "chat" ? chatCost(m, 60, 500, true) : mediaCost(m, n, true);

  function pick(k: Kind) {
    setKind(k);
    setModel(k === "chat" ? DEFAULT_CHAT : MODELS.find((x) => x.kind === k)?.id ?? DEFAULT_CHAT);
  }

  async function send() {
    if (busy) return ctrl.current?.abort();
    if (!q.trim() || kind !== "chat") return;
    setBusy(true); setErr(""); setOut(""); setThink(""); setRec(null);
    ctrl.current = new AbortController();
    try {
      const r = await streamChat(
        { model: m.id, messages: [{ role: "user", content: q }], max_tokens: 500 },
        { delta: (t) => setOut((o) => o + t), reasoning: (t) => setThink((o) => o + t), signal: ctrl.current.signal },
      );
      setRec(r);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`${s.dock} ${q || busy ? s.typing : ""}`} onSubmit={(e) => { e.preventDefault(); send(); }}>
      <div className={s.tabs} role="tablist" aria-label="Mode">
        {KINDS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} className={s.tab} style={kindVar(k)} onClick={() => pick(k)}>
            <Icon name={KIND_ICON[k]} />{cap(k)}{isSoon(k) && <span className={s.soonTag}>soon</span>}
          </button>
        ))}
      </div>
      <div className={s.bezel}>
        <div className={s.dRow}>
          <span className={s.cursor} aria-hidden />
          <label htmlFor="ask" className={s.vh}>Ask a model</label>
          <input id="ask" className={s.input} placeholder={HINT[kind]} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          {soon ? <span className={s.picker} style={kindVar(kind)}><span className={s.soonNote}>{cap(kind)} models are coming soon</span></span> : <span className={s.picker} style={kindVar(kind)}>
            <MakerMark name={m.maker} size={18} />
            <select value={m.id} onChange={(e) => setModel(e.target.value)} aria-label="Model">
              {list.map((c) => <option key={c.id} value={c.id}>{c.name}{c.free ? " · free" : ""}</option>)}
            </select>
            <Icon name="caret" size={12} />
          </span>}
          <p className={s.price}>
            <b>{est != null ? usd(fromMicro(est)) : "—"}</b>
            {estList != null ? <span><s>{usd(fromMicro(estList))}</s> at list</span> : null}
            <span className={s.vh}>{UNIT[kind]}</span>
          </p>
          <div className={s.actions}>
            {soon
              ? <button className="btn btn-primary" type="button" disabled>Coming soon</button>
              : kind === "chat"
                ? <button className="btn btn-primary" type="submit">{busy ? "Stop" : "Send"}</button>
                : <Link href="/chat" className="btn btn-primary">Open Wisp Chat</Link>}
            <Link href="/console/keys" className="btn"><Icon name="key" />Get your API key<span className={s.btnIc}><Icon name="out" size={12} /></span></Link>
          </div>
        </div>
        {(out || think || busy) && (
          <div className={s.out} aria-live="polite">{out || <span style={{ color: "var(--text-3)" }}>{think || "Waiting for the first token…"}</span>}</div>
        )}
        {err && <div className={s.err} role="alert">{err}{!m.free && " Free trial models are marked in the list."}</div>}
        {rec && (
          <div className={s.receipt}>
            <span>charged<b className="up">{usd(rec.charged)}</b></span>
            {rec.list != null && <span>at list<b className="strike">{usd(rec.list)}</b></span>}
            <span>tokens<b>{rec.tokens_in} in / {rec.tokens_out} out</b></span>
            <span>removed<b>{rec.removed.join(", ")}</b></span>
          </div>
        )}
        <div className={s.receives}>
          <span className={s.recLabel}>The model receives</span>
          <span className={s.echo}>{q.trim() ? `“${q.trim()}”` : `your ${kind === "chat" ? "question" : "prompt"}, and nothing else`}</span>
          <span className={s.stripped}>
            {([["wallet", 7.15], ["IP", 4.95], ["device", 3.85]] as const).map(([f, w]) => (
              <span key={f} className={s.field}><span>{f}</span><i style={{ width: `${w}em` }} /><span className={s.vh}>removed</span></span>
            ))}
            <span className={s.kept}>no copy kept</span>
          </span>
        </div>
      </div>
    </form>
  );
}
