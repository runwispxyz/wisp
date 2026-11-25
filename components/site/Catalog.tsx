"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MODELS, SHOWN_KINDS, chatCost, discount, fromMicro, isSoon, priceLabel, unitLabel, usd, type Kind, type Model } from "@/lib/models";
import { DotScene, type Scene } from "./DotScene";
import { Icon } from "./icons";
import { KIND_ICON, MakerMark, cap, kindVar } from "./parts";
import { CopyButton } from "./widgets";
import s from "./site.module.css";

const KINDS: Kind[] = SHOWN_KINDS;
const ART: Record<Kind, Scene> = { chat: "wave", image: "orb", video: "grid", music: "bars" };
const of = (k: Kind) => MODELS.filter((m) => m.kind === k);
const cheapest = (k: Kind) => of(k).reduce((a, b) => (b.price[0] < a.price[0] ? b : a));
const fromLine = (k: Kind) => { if (isSoon(k)) return "Coming soon"; const m = cheapest(k); return `from ${priceLabel(m)} ${unitLabel(m)}`; };

function Card({ m, on, pick }: { m: Model; on: boolean; pick: (id: string) => void }) {
  const d = discount(m);
  return (
    <li>
      <button className={`${s.mCard} ${on ? s.mCardOn : ""}`} style={kindVar(m.kind)} aria-pressed={on} onClick={() => pick(m.id)}>
        <span className={s.cardTop}><span className={s.mName}><MakerMark name={m.maker} size={18} />{m.name}</span>{d ? <span className={s.save}>-{d}%</span> : null}</span>
        <span className={s.ours}>{priceLabel(m)}</span>
        <span className={s.cardFoot}>{m.list ? <s className={s.struck}>{priceLabel(m, true)}</s> : null}<span>{unitLabel(m)}</span></span>
      </button>
    </li>
  );
}

function Belt({ label, items, reverse, sel, pick }: { label: string; items: Model[]; reverse?: boolean; sel: string; pick: (id: string) => void }) {
  return (
    <div>
      <p className={s.vh}>{label} <span>{items.length}</span></p>
      <div className={s.track}>
        <div className={`${s.belt} ${reverse ? s.reverse : ""}`} style={{ animationDuration: `${Math.max(30, items.length * 9)}s` }}>
          {[0, 1].map((n) => (
            <ul key={n} className={`${s.set} ${s.list}`} aria-hidden={n === 1 || undefined}>
              {/* the copy keeps the loop seamless; it is hidden from assistive tech */}
              {items.map((m) => <Card key={m.id} m={m} on={m.id === sel} pick={pick} />)}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Catalog() {
  const [tab, setTab] = useState<Kind | "all">("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(MODELS[0].id);
  const [paused, setPaused] = useState(false);
  const [tin, setTin] = useState(50); // millions of tokens a month
  const [tout, setTout] = useState(10);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(el.tagName) && !el.isContentEditable) { e.preventDefault(); search.current?.focus(); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const pick = (id: string) => setSel(id);
  const rows = MODELS.filter((m) => (tab === "all" || m.kind === tab) && (m.name + " " + m.maker + " " + m.id).toLowerCase().includes(q.toLowerCase()));
  const m = MODELS.find((x) => x.id === sel)!;
  const d = discount(m);
  const month = m.kind === "chat" ? chatCost(m, tin * 1e6, tout * 1e6) : null;
  const monthList = m.kind === "chat" ? chatCost(m, tin * 1e6, tout * 1e6, true) : null;
  const chat = of("chat"), half = Math.ceil(chat.length / 2);
  const makers = new Set(MODELS.map((x) => x.maker)).size;

  return (
    <>
      <div className={s.bento}>
        <div className={`${s.surface} ${s.dotfill} ${s.cLead}`}>
          <div className={s.fill}><DotScene scene="wave" /></div>
          <div className={s.cLeadText}>
            <p className={s.cBig}>{MODELS.length}<span>models on one key</span></p>
            <p className={s.cLine}>Each model shows its Wisp price per use, across {makers} makers.</p>
          </div>
        </div>
        {KINDS.map((k) => (
          <button key={k} className={`${s.surface} ${s.dotfill} ${s.cTile} ${tab === k ? s.cTileOn : ""} ${isSoon(k) ? s.soonCard : ""}`} style={kindVar(k)} aria-pressed={tab === k} onClick={() => setTab(tab === k ? "all" : k)}>
            <span className={s.tileArt}><DotScene scene={ART[k]} tint={`--kind-${k}`} solid /></span>
            <span className={s.tileText}>
              {isSoon(k)
                ? <b>{cap(k)} models <span className={s.soonTag}>soon</span></b>
                : <b>{of(k).length} {k} model{of(k).length === 1 ? "" : "s"} <Icon name="arrow" size={14} /></b>}
              <em>{fromLine(k)}</em>
            </span>
          </button>
        ))}
      </div>

      <div className={`${s.board} ${paused ? s.paused : ""}`}>
        <div className={s.controls}>
          <div className={s.kinds} role="group" aria-label="Filter by kind">
            {(["all", ...KINDS] as const).map((t) => (
              <button key={t} className={s.kind} style={t === "all" ? undefined : kindVar(t)} aria-pressed={tab === t} onClick={() => setTab(t)}>
                {t !== "all" && <Icon name={KIND_ICON[t]} />}{cap(t)} <span className={s.cnt}>{t === "all" ? MODELS.length : isSoon(t) ? "soon" : of(t).length}</span>
              </button>
            ))}
          </div>
          <label className={s.search}>
            <span className={s.vh}>Search models</span>
            <input ref={search} type="search" placeholder="Search models" value={q} onChange={(e) => setQ(e.target.value)} />
            <kbd className={s.sKey}>/</kbd>
          </label>
          <button className={s.pause} aria-pressed={paused} onClick={() => setPaused(!paused)}><i className={s.pip} />{paused ? "Play the rows" : "Pause the rows"}</button>
        </div>

        {tab === "all" && !q ? (
          <div className={s.rows}>
            <Belt label="Chat" items={chat.slice(0, half)} sel={sel} pick={pick} />
            <Belt label="Chat" items={chat.slice(half)} reverse sel={sel} pick={pick} />
            <Belt label="Images" items={MODELS.filter((x) => x.kind !== "chat")} sel={sel} pick={pick} />
          </div>
        ) : rows.length ? (
          <ul className={`${s.mGrid} ${s.list}`}>{rows.map((r) => <Card key={r.id} m={r} on={r.id === sel} pick={pick} />)}</ul>
        ) : (
          <p className={s.empty}>{tab !== "all" && isSoon(tab) ? `${cap(tab)} models are coming soon. Nothing here can be generated or charged yet.` : `No model matches “${q}”.`}</p>
        )}

        <p className={s.vh} aria-live="polite">{m.name} selected</p>
        <div className={s.ticket}>
          <div className={s.tTabs}>
            <p className={s.tTab} style={kindVar(m.kind)}><Icon name={KIND_ICON[m.kind]} />{cap(m.kind)}</p>
            <p className={s.tPriv}><i />Anonymized{m.free ? " · free trial" : ""}{m.demo ? " · demo" : ""}</p>
          </div>
          <div className={s.tBezel}>
            <div className={s.tParts}>
              <div>
                <h3 className={s.tName}><MakerMark name={m.maker} size={44} />{m.name}</h3>
                <div className={s.tCode}><code>{m.id}</code><CopyButton text={m.id} label="Copy id" /></div>
                <dl className={s.tSpecs}>
                  <div><dt>Maker</dt><dd>{m.maker}</dd></div>
                  {m.context && <div><dt>Context window</dt><dd>{m.context.toLocaleString("en-US")} tokens</dd></div>}
                  <div><dt>Runs as</dt><dd>{m.kind === "chat" ? "streaming chat call" : "job"}</dd></div>
                  <div><dt>Billed</dt><dd>{unitLabel(m)}</dd></div>
                </dl>
                <div className={s.tActions}>
                  <Link href="/chat" className="btn btn-primary">Try it in Wisp Chat</Link>
                  <Link href={`/console/models/${m.id}`} className="btn"><Icon name="key" />Get an API key</Link>
                </div>
              </div>
              <div>
                <span className={s.tLabel}><i className={s.liveDot} />Live price</span>
                <p className={s.tBig}>{priceLabel(m)}</p>
                <div className={s.tList}>
                  {m.list ? <><s className={s.struck}>{priceLabel(m, true)}</s>{d ? <span className={s.pillFill}>{d}% below list</span> : null}</> : null}
                </div>
                {d != null && (
                  <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                    <span className={s.mTrack} aria-hidden><i className={s.mOurs} style={{ width: `${100 - d}%` }} /></span>
                    <span className={s.mKey}><span>Wisp price</span><b>{100 - d}% of list</b></span>
                  </div>
                )}
                <p className={s.tNote}>{unitLabel(m)}. Each call holds its worst case and is charged only what it used.</p>
              </div>
              <div>
                {m.kind === "chat" ? (
                  <>
                    <span className={s.tLabel}>A month of it</span>
                    <label className={s.slider}><span>Input tokens a month <b>{tin}M</b></span>
                      <input type="range" min={1} max={200} value={tin} style={{ "--fill": `${(tin - 1) / 1.99}%` } as React.CSSProperties} onChange={(e) => setTin(+e.target.value)} />
                    </label>
                    <label className={s.slider}><span>Output tokens a month <b>{tout}M</b></span>
                      <input type="range" min={1} max={100} value={tout} style={{ "--fill": `${(tout - 1) / 0.99}%` } as React.CSSProperties} onChange={(e) => setTout(+e.target.value)} />
                    </label>
                    <dl className={s.tTotals}>
                      <div><dt>On Wisp</dt><dd>{month != null ? usd(fromMicro(month), 2) : "—"}</dd></div>
                      {monthList != null && <div><dt>At list</dt><dd className={s.struck}>{usd(fromMicro(monthList), 2)}</dd></div>}
                      {month != null && monthList != null && <div><dt>Saved</dt><dd className={s.keep}>{usd(fromMicro(monthList - month), 2)}</dd></div>}
                    </dl>
                  </>
                ) : (
                  <>
                    <span className={s.tLabel}>How it runs</span>
                    <p className={s.tNote}>Start a job on your key, poll it, then fetch the result once. The result is deleted from our servers after you fetch it.</p>
                  </>
                )}
              </div>
            </div>
            <div className={s.tReceives}>
              <span className={s.recLabel}>The model receives</span>
              <span className={s.echo}>your prompt and settings, nothing about you</span>
              <span className={s.stripped}>
                {([["wallet", 7.15], ["IP", 4.95], ["device", 3.85]] as const).map(([f, w]) => <span key={f} className={s.field}><span>{f}</span><i style={{ width: `${w}em` }} /></span>)}
                <span className={s.kept}>no copy kept</span>
              </span>
            </div>
          </div>
        </div>
        <div className={s.cFoot}>
          <p>Pick a model to see its price, its id and how to call it.</p>
          <Link href="/pricing" className={s.link}>Every price per use <Icon name="out" size={12} /></Link>
        </div>
      </div>
    </>
  );
}
