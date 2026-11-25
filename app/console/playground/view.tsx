"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card, CodeTabs, ErrorNote, Head, errMsg, s, snippets, useBase, useConsoleMe } from "@/components/console/ui";
import { refreshMe, runJob, streamChat, type Receipt } from "@/lib/client";
import { DEFAULT_CHAT, MODELS, SOON_KINDS, getModel, priceLabel, unitLabel, usd, LIVE_KINDS } from "@/lib/models";

type Msg = { role: "user" | "assistant"; content: string; reasoning?: string };
type Media = { url: string; mime: string; charged: number; held: number };

export default function Playground() {
  const { me } = useConsoleMe();
  const base = useBase();
  const [modelId, setModelId] = useState(DEFAULT_CHAT);
  const m = getModel(modelId) ?? MODELS[0];
  const [tab, setTab] = useState<"run" | "code">("run");
  const [system, setSystem] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [seconds, setSeconds] = useState(4);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const abort = useRef<AbortController | null>(null);
  const logEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get("model");
    if (id && getModel(id)) setModelId(id);
    if (p.get("q")) setInput(p.get("q")!);
  }, []);
  useEffect(() => () => { if (media) URL.revokeObjectURL(media.url); }, [media]);
  useEffect(() => { logEnd.current?.scrollIntoView({ block: "nearest" }); }, [msgs]);

  const pickModel = (id: string) => {
    setModelId(id); setMsgs([]); setReceipt(null); setMedia(null); setError(undefined);
    history.replaceState(null, "", `?model=${id}`);
  };

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError(undefined); setBusy(true); setReceipt(null);
    try {
      if (m.kind === "chat") {
        const history: Msg[] = [...msgs, { role: "user", content: text }];
        setMsgs([...history, { role: "assistant", content: "" }]);
        setInput("");
        abort.current = new AbortController();
        const upd = (f: (a: Msg) => Msg) => setMsgs((xs) => [...xs.slice(0, -1), f(xs[xs.length - 1])]);
        const r = await streamChat(
          { model: m.id, messages: [...(system ? [{ role: "system", content: system }] : []), ...history.map(({ role, content }) => ({ role, content }))], temperature, max_tokens: maxTokens },
          { delta: (t) => upd((a) => ({ ...a, content: a.content + t })), reasoning: (t) => upd((a) => ({ ...a, reasoning: (a.reasoning ?? "") + t })), signal: abort.current.signal },
        );
        setReceipt(r);
      } else {
        setMedia(null); setStatus("queued");
        const r = await runJob({ model: m.id, prompt: text, ...(m.kind === "video" ? { seconds } : {}) }, setStatus);
        setMedia({ url: URL.createObjectURL(r.blob), mime: r.mime, charged: r.charged, held: r.held });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(errMsg(e));
    } finally {
      setBusy(false); setStatus(""); abort.current = null; refreshMe();
    }
  }


  return (
    <>
      <Head art="playground" title="Playground" sub="Runs are paid from your balance and billed like an API call. Nothing you type here is stored by Wisp.">
        <span className={s.seg} role="tablist" aria-label="Mode">
          {(["run", "code"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "run" ? "Run" : "Code"}</button>
          ))}
        </span>
      </Head>

      {me === null && (
        <p className={s.status} style={{ marginBottom: 12 }}>
          Not signed in: only free-trial models run, a few times.&nbsp;<Link href="/console" className={s.link}>Sign in</Link>&nbsp;to use your balance.
        </p>
      )}

      <div className={s.bento}>
        <Card star title={m.name} note={`${priceLabel(m)} ${unitLabel(m)}`} className={s.s8} end={<Link href={`/console/models/${m.id}`} className={s.link}>Details</Link>}>
          {tab === "code" ? (
            <CodeTabs tabs={snippets(m, base, m.kind === "chat" ? { prompt: input || undefined, system: system || undefined, temperature, max_tokens: maxTokens } : { prompt: input || undefined })} />
          ) : (
            <div className={s.stack}>
              {m.kind === "chat" ? (
                <div className={s.log} aria-live="polite">
                  {!msgs.length && <p className={s.empty}>Send a message to {m.name}.</p>}
                  {msgs.map((x, i) => (
                    <div key={i} className={`${s.msg} ${x.role === "user" ? s.msgUser : ""}`}>
                      {x.reasoning && <div className={s.reasoning}>{x.reasoning}</div>}
                      {x.content || (busy && i === msgs.length - 1 ? <span className={s.dim}>…</span> : "")}
                    </div>
                  ))}
                  <div ref={logEnd} />
                </div>
              ) : (
                <div className={s.log} aria-live="polite" style={{ alignItems: "flex-start" }}>
                  {!media && !busy && <p className={s.empty} style={{ alignSelf: "stretch" }}>Describe what {m.name} should make.</p>}
                  {busy && <p className={s.status}>Job {status || "starting"}…</p>}
                  {media && (media.mime.startsWith("audio/")
                    ? <audio controls src={media.url} style={{ width: "100%" }} />
                    : <img src={media.url} alt={`Result from ${m.name}`} className={s.media} />)}
                  {media && (
                    <div className={s.row}>
                      <span className={s.chip}>held {usd(media.held)}</span>
                      <span className={`${s.chip} ${s.chipLit}`}>charged {usd(media.charged)}</span>
                      <a className={`${s.btn} ${s.sm}`} href={media.url} download={`wisp-${m.id}`}>Download</a>
                    </div>
                  )}
                </div>
              )}
              <ErrorNote error={error} />
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className={s.stack} style={{ gap: 8 }}>
                <label className="sr" htmlFor="pg-input">Prompt</label>
                <textarea id="pg-input" className={s.input} rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder={m.kind === "chat" ? "Write a message" : "Describe the result"}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <div className={s.between}>
                  <span className={s.dim} style={{ fontSize: 12.5 }}>Enter to send, Shift+Enter for a new line</span>
                  <div className={s.row}>
                    {m.kind === "chat" && msgs.length > 0 && !busy && <button type="button" className={`${s.btn} ${s.quiet}`} onClick={() => { setMsgs([]); setReceipt(null); }}>Clear</button>}
                    {busy && m.kind === "chat"
                      ? <button type="button" className={s.btn} onClick={() => abort.current?.abort()}>Stop</button>
                      : <button type="submit" className={`${s.btn} ${s.lit}`} disabled={busy || !input.trim()}>{m.kind === "chat" ? "Send" : "Run"}</button>}
                  </div>
                </div>
              </form>
            </div>
          )}
        </Card>

        <div className={`${s.s4} ${s.stack}`}>
          <Card title="Settings">
            <div className={s.stack}>
              <label><span className={s.label}>Model</span>
                <select className={s.input} value={m.id} onChange={(e) => pickModel(e.target.value)}>
                  {LIVE_KINDS.map((k) => (
                    <optgroup key={k} label={k[0].toUpperCase() + k.slice(1)}>
                      {MODELS.filter((x) => x.kind === k).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </optgroup>
                  ))}
                  {SOON_KINDS.map((k) => (
                    <optgroup key={k} label={`${k[0].toUpperCase() + k.slice(1)} (coming soon)`}>
                      <option disabled value="">Coming soon</option>
                    </optgroup>
                  ))}
                </select>
              </label>
              {m.kind === "chat" && (
                <>
                  <label><span className={s.label}>System prompt</span><textarea className={s.input} rows={3} value={system} onChange={(e) => setSystem(e.target.value)} placeholder="Optional" /></label>
                  <label><span className={s.label}>Temperature <span style={{ fontFamily: "var(--mono)", color: "var(--text)" }}>{temperature.toFixed(1)}</span></span>
                    <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(+e.target.value)} style={{ width: "100%", accentColor: "var(--room)" }} /></label>
                  <label><span className={s.label}>Max tokens</span><input className={s.input} type="number" min={1} max={m.context} value={maxTokens} onChange={(e) => setMaxTokens(Math.max(1, +e.target.value))} /></label>
                </>
              )}
              {m.kind === "video" && (
                <label><span className={s.label}>Seconds</span><input className={s.input} type="number" min={1} max={20} value={seconds} onChange={(e) => setSeconds(Math.max(1, +e.target.value))} /></label>
              )}
            </div>
          </Card>
          {receipt && (
            <Card title="Receipt" note="Last run">
              <dl className={`${s.facts} ${s.factsTight}`}>
                <div><dt>Held</dt><dd>{usd(receipt.held)}</dd></div>
                <div><dt>Charged</dt><dd>{usd(receipt.charged)}</dd></div>
                {receipt.list != null && <div><dt>At list</dt><dd><span className={s.strike}>{usd(receipt.list)}</span></dd></div>}
                {receipt.list != null && <div><dt>Saved</dt><dd className={s.up}>{usd(receipt.list - receipt.charged)}</dd></div>}
                <div><dt>Tokens</dt><dd>{receipt.tokens_in.toLocaleString()} in · {receipt.tokens_out.toLocaleString()} out</dd></div>
                {receipt.removed?.length > 0 && <div><dt>Removed</dt><dd>{receipt.removed.join(", ")}</dd></div>}
              </dl>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
