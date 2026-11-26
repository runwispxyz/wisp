"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { hasInjectedWallet, LIVE, signIn, useHealth, type Receipt, type SignInStep } from "@/lib/client";
import { HAS_LIST, MODELS, discount, getModel, priceLabel, unitLabel, usd, type Kind, type Model } from "@/lib/models";
import { Icon, KIND_ICON, MakerMark } from "./art";
import { Markdown, CopyButton } from "./MarkdownView";
import { download, type Msg } from "./store";
import s from "./chat.module.css";

/** Popover state that closes on Escape and on a click outside its wrapper. */
export function usePop() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    addEventListener("keydown", key);
    addEventListener("mousedown", down);
    return () => { removeEventListener("keydown", key); removeEventListener("mousedown", down); };
  }, [open]);
  return { open, setOpen, ref };
}

export function Popover({ label, children, className = "", up, right, center, title, wrapClass = "", popClass = "", ariaLabel }: {
  label: ReactNode; children: (close: () => void) => ReactNode; className?: string; up?: boolean; right?: boolean; center?: boolean;
  title?: string; wrapClass?: string; popClass?: string; ariaLabel?: string;
}) {
  const p = usePop();
  return (
    <div className={`${s.popWrap} ${wrapClass}`} ref={p.ref}>
      <button type="button" className={className} aria-expanded={p.open} aria-haspopup="true" title={title} aria-label={ariaLabel} onClick={() => p.setOpen(!p.open)}>{label}</button>
      {p.open && <div className={`${s.pop} ${up ? s.popUp : ""} ${right ? s.popRight : ""} ${center ? s.popCenter : ""} ${popClass}`}>{children(() => p.setOpen(false))}</div>}
    </div>
  );
}

export const KIND_LABEL: Record<Kind, string> = { chat: "Text", image: "Image", video: "Video", music: "Music" };
export const kindVar = (k: Kind) => ({ "--k": `var(--kind-${k})` }) as CSSProperties;

const ctxLabel = (n?: number) => (!n ? "" : n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M context` : `${Math.round(n / 1000)}K context`);

/** Trigger plus a modal model chooser (native dialog: focus trap, Esc and backdrop for free). */
export function ModelPicker({ mode, value, signedIn, onPick, onLocked, className = "" }: {
  mode: Kind; value: string; signedIn: boolean; onPick: (id: string) => void; onLocked: () => void; className?: string;
}) {
  const cur = getModel(value);
  const dlg = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [maker, setMaker] = useState("");
  const [peekId, setPeek] = useState(value);
  const all = MODELS.filter((m) => m.kind === mode);
  const makers = [...new Set(all.map((m) => m.maker))];
  const list = all.filter((m) => (!maker || m.maker === maker) && (m.name + " " + m.maker).toLowerCase().includes(q.trim().toLowerCase()));
  const peek = getModel(peekId) ?? cur;
  const qRef = useRef<HTMLInputElement>(null);
  const health = useHealth();
  const down = (id: string) => (health[id]?.ok === false ? health[id].note : "");
  const open = () => { setQ(""); setMaker(""); setPeek(value); dlg.current?.showModal(); qRef.current?.focus(); };
  const close = () => dlg.current?.close();
  const choose = (m: Model) => { close(); if (!signedIn && !m.free) onLocked(); else onPick(m.id); };
  return (
    <>
      <button type="button" className={`${s.mpTrigger} ${className}`} style={kindVar(mode)} onClick={open} aria-haspopup="dialog"
        aria-label={`Model ${cur?.name ?? "none"}. Change model`}>
        <MakerMark maker={cur?.maker ?? "?"} className={s.mark} />
        <span className={s.mpName}>{cur?.name ?? "Model"}</span>
        <span className={s.caret} aria-hidden />
      </button>
      <dialog ref={dlg} className={s.mp} style={kindVar(mode)} aria-labelledby="mp-title" onClick={(e) => e.target === e.currentTarget && close()}>
        <div className={s.dlgHead}>
          <h2 id="mp-title">Choose a model</h2>
          <button type="button" className={s.dlgX} onClick={close} aria-label="Close"><Icon name="close" size={12} /></button>
        </div>
        <div className={s.mpTop}>
          <span className={s.mpKind}><Icon name={KIND_ICON[mode]} style={{ color: "var(--k)" }} />{KIND_LABEL[mode]} models <b className="mono">{all.length}</b></span>
          <label className={s.mpSearch}>
            <Icon name="search" />
            <input ref={qRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models or makers" aria-label="Search models" />
            <kbd>esc</kbd>
          </label>
        </div>
        <div className={s.mpBody}>
          <div className={s.mpLeft}>
            <nav className={s.mpMakers} aria-label="Makers">
              {["", ...makers].map((mk) => (
                <button key={mk || "all"} type="button" aria-pressed={maker === mk} onClick={() => setMaker(mk)}>
                  {mk ? <MakerMark maker={mk} size={14} /> : <span className={s.mpAll}><i /><i /><i /><i /></span>}
                  <span>{mk || "All makers"}</span>
                  <b className="mono">{mk ? all.filter((m) => m.maker === mk).length : all.length}</b>
                </button>
              ))}
            </nav>
            <div className={s.mpList} role="listbox" aria-label={`${KIND_LABEL[mode]} models`}>
              {!list.length && <p className={s.mpNone}>No model matches.</p>}
              {list.map((m) => {
                const locked = !signedIn && !m.free;
                return (
                  <button key={m.id} type="button" role="option" aria-selected={m.id === value} className={s.mpRow}
                    onMouseEnter={() => setPeek(m.id)} onFocus={() => setPeek(m.id)} onClick={() => choose(m)}>
                    <MakerMark maker={m.maker} size={42} className={s.mark} />
                    <span className={s.mpMain}>
                      <span className={s.mpRowName}>{m.name} <Badges m={m} locked={locked} down={down(m.id)} /></span>
                      <span className={s.mpSub}>{m.maker}{m.context ? ` · ${ctxLabel(m.context)}` : ` · ${unitLabel(m)}`}</span>
                    </span>
                    <span className={s.mpPrice}><b className="mono">{priceLabel(m)}</b>{m.list && <s className="mono">{priceLabel(m, true)}</s>}</span>
                    <span className={s.mpTick}>{m.id === value ? <Icon name="check" /> : null}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {peek && (
            <aside className={s.mpPeek} aria-live="polite">
              <MakerMark maker={peek.maker} size={84} className={s.mpPeekMark} />
              <b className={s.mpPeekName}>{peek.name}</b>
              <span className={s.mpPeekMaker}>{peek.maker}{peek.context ? ` · ${ctxLabel(peek.context)}` : ""}</span>
              <dl>
                <div><dt>On Wisp</dt><dd className="mono">{priceLabel(peek)}</dd></div>
                {peek.list && <div><dt>List price</dt><dd className="mono"><s>{priceLabel(peek, true)}</s></dd></div>}
                {discount(peek) != null && <div><dt>You save</dt><dd className="mono accent">{`${discount(peek)} %`}</dd></div>}
                <div><dt>Privacy</dt><dd><span className="pill" style={{ height: 20 }}>Anonymized</span></dd></div>
              </dl>
              <p>Wallet, IP address and device are stripped before {peek.maker} gets the prompt.</p>
              {down(peek.id) && <p style={{ color: "var(--warn)" }}>Not working right now: {down(peek.id)}. A failed call costs nothing.</p>}
              <button type="button" className={s.mpGo} data-on={peek.id === value} onClick={() => choose(peek)}>
                {peek.id === value ? "In use" : !signedIn && !peek.free ? "Connect a wallet to use" : "Use this model"}
              </button>
            </aside>
          )}
        </div>
        <div className={s.mpFoot}>{cur ? `Prices ${unitLabel(cur)}.${HAS_LIST ? " Struck-through prices are the list price elsewhere." : ""}` : ""}</div>
      </dialog>
    </>
  );
}

export function Badges({ m, locked, down }: { m: Model; locked?: boolean; down?: string }) {
  return (
    <>
      {down && <span className="pill" title={down} style={{ height: 18, marginLeft: 4, color: "var(--warn)" }}>down</span>}
      {m.free && !locked && <span className="pill pill-accent" style={{ height: 18, marginLeft: 4 }}>free</span>}
      {locked && <span className="pill" style={{ height: 18, marginLeft: 4 }}>wallet</span>}
      {m.vision && <span className="pill" style={{ height: 18, marginLeft: 4 }}>vision</span>}
      {m.demo && <span className="pill" style={{ height: 18, marginLeft: 4, color: "var(--warn)" }}>demo</span>}
    </>
  );
}

export function PrivacyMenu() {
  return (
    <Popover center className={s.pp} popClass={s.ppPop} ariaLabel="Privacy tier: Anonymized"
      label={<><Icon name="shield" className={s.ppIco} /><span className={s.ppT}>Privacy<i>·</i>Anonymized</span><span className={s.caret} aria-hidden /></>}>
      {() => (
        <>
          <div className={s.ppOpt} data-on="true">
            <span className={s.ppBox}><Icon name="shield" /></span>
            <span><b>Anonymized</b>Wallet, IP and device details are stripped before the host sees your prompt. The host still reads the prompt to answer it.</span>
          </div>
          <div className={s.ppOpt} data-soon="true">
            <span className={s.ppBox}><Icon name="lock" /></span>
            <span><b>Sealed <small className="mono">coming soon</small></b>Sealed in this browser for a verified enclave, so neither Wisp nor the host can read it.</span>
          </div>
        </>
      )}
    </Popover>
  );
}

const STEPS: [SignInStep, string][] = [["connect", "Connect the wallet"], ["sign", "Sign one message (free, no transaction)"], ["done", "Signed in"]];

export function ConnectModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<SignInStep | null>(null);
  const [error, setError] = useState("");
  const injected = typeof window !== "undefined" && hasInjectedWallet();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  const go = async (demo: boolean) => {
    setError("");
    try {
      await signIn({ demo, onStep: setStep });
      setTimeout(onClose, 500);
    } catch (e) {
      setStep(null);
      setError((e as Error).message || "Sign-in failed");
    }
  };
  const idx = step ? STEPS.findIndex(([k]) => k === step) : -1;
  return (
    <div className={s.scrim} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card ${s.modal}`} role="dialog" aria-modal="true" aria-labelledby="cw-title">
        <h2 id="cw-title">Connect a wallet</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Unlocks every model and pays per use from one balance. Signing in is a signature, not a transaction.</p>
        {injected && <button className="btn btn-primary" disabled={!!step} onClick={() => go(false)}>Browser wallet</button>}
        {!LIVE && <button className={`btn ${injected ? "" : "btn-primary"}`} disabled={!!step} onClick={() => go(true)}>Demo wallet (mock chain)</button>}
        {LIVE && !injected && <p className="muted" style={{ margin: 0, fontSize: 14 }}>No wallet in this browser. Add MetaMask or Rabby and reload, or open this page in your wallet app&apos;s browser.</p>}
        {step && (
          <ol className={s.steps}>
            {STEPS.map(([k, t], i) => <li key={k} data-on={i === idx} data-done={i < idx || step === "done"}>{i < idx || step === "done" ? "✓" : i === idx ? "…" : "·"} {t}</li>)}
          </ol>
        )}
        {error && <div className={s.err}>{error}</div>}
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ justifySelf: "end" }}>Close</button>
      </div>
    </div>
  );
}

function ReceiptLine({ r, trial }: { r: Receipt; trial: boolean }) {
  const saved = r.list != null && r.list > r.charged ? r.list - r.charged : 0;
  return (
    <>
      <span className="mono tabnum">
        {trial ? "Free (trial)" : usd(r.charged)}
        {!trial && saved > 0 && <> <span className="strike">{usd(r.list!)}</span> <span className="up">saved {usd(saved)}</span></>}
      </span>
      <span className="mono tabnum">{r.tokens_in.toLocaleString()} in · {r.tokens_out.toLocaleString()} out</span>
      <Popover up className={s.icon} label="Privacy record" title="What was removed before the model saw it">
        {() => (
          <div className={s.privItem} style={{ width: 280 }}>
            <b>Removed before sending</b>
            <ul style={{ margin: "2px 0 6px", paddingLeft: 18 }}>{r.removed.map((x) => <li key={x}>{x.replace(/_/g, " ")}</li>)}</ul>
            <b>Kept</b>
            <span>{r.kept}</span>
            <span className="faint" style={{ marginTop: 6 }}>{trial ? "Free trial: nothing was charged." : <>Held {usd(r.held)}, charged {usd(r.charged)}.</>}</span>
          </div>
        )}
      </Popover>
    </>
  );
}

function MediaView({ m, id }: { m: NonNullable<Msg["media"]>; id: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(m.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [m.blob]);
  if (!url) return null;
  const ext = m.mime.split("/")[1]?.split("+")[0] || "bin";
  return (
    <div className={s.mediaWrap}>
      {m.mime.startsWith("audio/") ? <audio controls src={url} style={{ width: "min(420px, 100%)" }} />
        : m.mime.startsWith("video/") ? <video controls src={url} className={s.media} />
        : <img src={url} alt="Generated result" className={s.media} style={{ maxHeight: 520 }} />}
      <button className="btn btn-sm" onClick={() => download(m.blob, `wisp-${id.slice(0, 8)}.${ext}`)}>Download</button>
    </div>
  );
}

export function MessageView({ m, streaming, status, last, onRegenerate, onConnect }: {
  m: Msg; streaming: boolean; status?: string; last: boolean; onRegenerate: () => void; onConnect: () => void;
}) {
  if (m.role === "user")
    return (
      <div className={s.user}>
        {m.content}
        {!!m.attachments?.length && (
          <div className={s.atts}>
            {m.attachments.map((a, i) => a.dataUrl ? <img key={i} src={a.dataUrl} alt={a.name} /> : <span key={i} className="pill">{a.name}</span>)}
          </div>
        )}
      </div>
    );
  const model = getModel(m.model || "");
  const waiting = streaming && !m.content && !m.media;
  return (
    <div className={s.asst}>
      <div className={s.who}>{model?.name ?? m.model}{model?.demo && <span className="pill" style={{ height: 18, color: "var(--warn)" }}>demo</span>}</div>
      {m.reasoning && (
        <details className={s.think} open={streaming && !m.content}>
          <summary>{streaming && !m.content ? "Thinking…" : "Thinking"}</summary>
          <div>{m.reasoning}</div>
        </details>
      )}
      {waiting && !m.reasoning && <span className={s.busy}><i className={s.pulse} />{status || "Working…"}</span>}
      {m.content && <div className={streaming ? s.streamCaret : ""}><Markdown text={m.content} /></div>}
      {m.media && <MediaView m={m.media} id={m.id} />}
      {m.error && (
        m.error.kind === "trial" || m.error.kind === "auth" ? (
          <div className={`card ${s.gate}`}>
            <b>{m.error.kind === "trial" ? "Your free prompts are used up" : "This model needs a wallet"}</b>
            <span className="muted" style={{ fontSize: 14 }}>Connect a wallet to keep going. Every model runs on one balance and you pay per use.</span>
            <button className="btn btn-primary btn-sm" style={{ justifySelf: "start" }} onClick={onConnect}>Connect a wallet</button>
          </div>
        ) : (
          <div className={s.err}>
            {m.error.message}
            {m.error.kind === "balance" && <a href="/console/credit" className="btn btn-sm" style={{ justifySelf: "start" }}>Top up in the console</a>}
          </div>
        )
      )}
      {!streaming && (m.content || m.media || m.error) && (
        <div className={s.actions}>
          {m.content && <CopyButton text={m.content} />}
          {last && <button className={s.icon} onClick={onRegenerate}>Regenerate</button>}
          {m.receipt && <ReceiptLine r={m.receipt} trial={!!m.free} />}
          {m.media && <span className="mono tabnum">{m.free ? "Free (trial)" : `${usd(m.media.charged)} · held ${usd(m.media.held)}`}</span>}
        </div>
      )}
    </div>
  );
}
