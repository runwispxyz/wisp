"use client";
// Shared console pieces: signed-in context, data hook, sign-in panel, copy, code tabs, chart, snippets.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, hasInjectedWallet, LIVE, signIn, type Me, type SignInStep } from "@/lib/client";
import Link from "next/link";
import { HAS_LIST, MODELS, SHOWN_KINDS, isSoon, usd, type Model } from "@/lib/models";
import { Icon, KIND_ART, LockArt, MARKS, Pix, TILES } from "./art";
import s from "./console.module.css";

export { s };

export type Key = { id: number; name: string; prefix: string; cap: number | null; spent: number; expires: number | null; models: string[]; revoked: boolean; created: number; lastUsed: number | null };
export type Row = { k: string; calls: number; tok_in: number; tok_out: number; units: number; cost: number; list: number };
export type Usage = { byDay: Row[]; byModel: Row[] };
export type Call = { id: string | number; model: string; kind: string; tok_in: number | null; tok_out: number | null; units: number | null; held: number; cost: number; list_cost: number | null; status: string; source: string; created: number; key: string | null };
export type Deposit = { ref: string; token: string; amount: number; credit: number; status: string; created: number };

export const MeCtx = createContext<{ me: Me | null | undefined; reload: () => void }>({ me: undefined, reload: () => {} });
export const useConsoleMe = () => useContext(MeCtx);

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
export const when = (t: number | null | undefined) => (t ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
export const num = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString());

/** GET a JSON path while `path` is non-null. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const load = useCallback(
    () => (path ? api<T>(path).then((d) => { setData(d); setError(undefined); }, (e) => setError(errMsg(e))) : Promise.resolve()),
    [path],
  );
  useEffect(() => { load(); }, [load]);
  return { data, error, reload: load };
}

/** Run fn when the page opens with #name, or when the shell fires that action (shortcut while already on the page). */
export function useAction(name: string, fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (location.hash === "#" + name) setTimeout(() => ref.current());
    const on = (e: Event) => (e as CustomEvent).detail === name && ref.current();
    window.addEventListener("wisp:action", on);
    return () => window.removeEventListener("wisp:action", on);
  }, [name]);
}
export const fireAction = (name: string) => window.dispatchEvent(new CustomEvent("wisp:action", { detail: name }));

export function ErrorNote({ error }: { error?: string | null }) {
  return error ? <div className={s.error} role="alert">{error}</div> : null;
}

/** Page header: room mark, title, one line, actions on the right. */
export function Head({ art, title, sub, children }: { art?: string; title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className={s.head}>
      {art && MARKS[art] && <span className={s.mark}><Pix art={MARKS[art]} /></span>}
      <div className={s.headT}>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className={s.acts}>{children}</div>}
    </header>
  );
}

/** A bento card with an optional title row. */
export function Card({ title, note, end, star, className = "", children, id, label }: {
  title?: string; note?: React.ReactNode; end?: React.ReactNode; star?: boolean; className?: string; children?: React.ReactNode; id?: string; label?: string;
}) {
  return (
    <section id={id} className={`${s.c} ${s.col} ${star ? s.star : ""} ${className}`} aria-label={label ?? title}>
      {(title || end) && (
        <div className={s.ch}>
          {title && <h2>{title}</h2>}
          {note && <span>{note}</span>}
          {end && <div className={s.chEnd}>{end}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, note, tone, className = s.s3, star }: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: "up" | "down"; className?: string; star?: boolean }) {
  return (
    <Card title={label} className={className} star={star}>
      <p className={`${s.fig} ${tone ? s[tone] : ""}`}>{value}</p>
      {note && <p className={`${s.lbl} ${s.note}`}>{note}</p>}
    </Card>
  );
}

export function Copy({ text, label = "Copy", className = `${s.btn} ${s.sm} ${s.quiet}` }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={className} onClick={() => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}>
      {done ? "Copied" : label}
    </button>
  );
}

/** Code with quoted strings tinted in the room colour. */
const tint = (code: string) => code.split(/("[^"\n]*")/g).map((p, i) => (i % 2 ? <span key={i} className={s.q}>{p}</span> : p));

export function CodeTabs({ tabs }: { tabs: { label: string; code: string }[] }) {
  const [i, setI] = useState(0);
  const cur = tabs[Math.min(i, tabs.length - 1)];
  return (
    <div className={s.code}>
      <div className={s.codeBar} role="tablist" aria-label="Language">
        {tabs.map((t, j) => (
          <button key={t.label} type="button" role="tab" aria-selected={j === i} className={`${s.tab} ${j === i ? s.tabOn : ""}`} onClick={() => setI(j)}>{t.label}</button>
        ))}
        <Copy text={cur.code} />
      </div>
      <pre className={s.pre}>{tint(cur.code)}</pre>
    </div>
  );
}

const STEPS: [SignInStep, string][] = [["connect", "Connect"], ["sign", "Sign"], ["done", "You're in"]];
const STEP_SAY: Record<SignInStep, string> = { connect: "Waiting for the wallet to connect…", sign: "Sign the message in your wallet. It costs no gas.", done: "Signed in. Loading your console…" };

/** The sign-in panel: lock art, three steps, wallet buttons. */
export function SignIn() {
  const [step, setStep] = useState<SignInStep | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [injected, setInjected] = useState(false);
  useEffect(() => setInjected(hasInjectedWallet()), []);
  const at = step ? STEPS.findIndex((x) => x[0] === step) : 0;
  const go = async (demo: boolean) => {
    setError(undefined); setBusy(true);
    try { await signIn({ demo, onStep: setStep }); } catch (e) { setError(errMsg(e)); setStep(null); } finally { setBusy(false); }
  };
  return (
    <section className={`${s.c} ${s.star} ${s.siStar}`} aria-labelledby="signin-h">
      <div className={s.sgn}>
        <header className={s.sgnHead}>
          <LockArt className={s.lock} />
          <h1 id="signin-h">Sign in with your wallet</h1>
          <p className={s.sgnLead}>One signed message on Robinhood Chain. No gas, no transaction, and no email or password to remember.</p>
        </header>
        <ol className={s.steps} aria-label="Sign-in steps">
          {STEPS.map(([k, label], i) => {
            const done = i < at || step === "done";
            return (
              <li key={k} className={`${s.step} ${done ? s.stepDone : i === at ? s.stepOn : ""}`} aria-current={i === at ? "step" : undefined}>
                <div className={s.stepHead}><span className={s.stepN}>{done ? "✓" : i + 1}</span><span className={s.stepT}>{label}</span></div>
              </li>
            );
          })}
        </ol>
        <div className={s.sgnBody}>
          <div className={s.none}>
            <span className={s.noneIco}><Pix art={["####.", "#..##", "#####", "#...#", "#####"]} cell={2} gap={1} /></span>
            <p className={s.noneT}>{injected ? "A wallet is ready in this browser" : "No wallet in this browser"}</p>
            <p>{LIVE
              ? injected
                ? "Connect it and sign one message to open your console."
                : "Add a browser wallet such as MetaMask or Rabby and reload this page. On a phone, open this page inside your wallet app's browser."
              : injected
                ? "Connect it and sign one message to open your console. Or try everything first with a demo wallet kept in this browser."
                : "The demo wallet is a key kept in this browser, made for trying the console on the mock chain. On a phone, open this page inside your wallet app's browser."}</p>
            <div className={s.get}>
              {injected && <button type="button" disabled={busy} onClick={() => go(false)}>Connect browser wallet</button>}
              {!LIVE && <button type="button" disabled={busy} onClick={() => go(true)}>Use a demo wallet</button>}
              {!injected && <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">Get a browser wallet <Icon name="out" size={10} /></a>}
            </div>
          </div>
          {busy && step && <p className={s.status} role="status">{STEP_SAY[step]}</p>}
          <ErrorNote error={error} />
        </div>
        <p className={s.sgnNote}>Wisp keeps your wallet address and one billing row per request for 30 days. It never stores a prompt, a reply or a file.</p>
      </div>
    </section>
  );
}

export const KCLS = { chat: s.kChat, image: s.kImage, video: s.kVideo, music: s.kMusic } as const;

/** Full signed-out page: title line, the sign-in panel and what the console holds. */
export function SignInPage({ title, sub }: { title: string; sub: string }) {
  const makers = new Set(MODELS.map((m) => m.maker)).size;
  const under = MODELS.filter((m) => m.list).length;
  return (
    <div className={s.si}>
      <p className={s.siPage}><b>{title}</b><span>{sub}</span></p>
      <div className={s.siGrid}>
        <SignIn />
        <aside className={s.siIn} aria-label="What the console holds">
          <section className={`${s.c} ${s.siC} ${s.isModels}`} aria-labelledby="si-models">
            <div className={s.ch}><h2 id="si-models">Models</h2></div>
            <div className={s.kinds}>
              {SHOWN_KINDS.map((k) => (
                <Link key={k} href={`/console/models?kind=${k}`} className={KCLS[k]}>
                  <Pix art={KIND_ART[k]} />
                  <b>{isSoon(k) ? "soon" : MODELS.filter((m) => m.kind === k).length}</b><span>{k}</span>
                </Link>
              ))}
            </div>
            <div className={s.siFoot}>
              <p className={s.lbl}>{MODELS.length} models from {makers} makers behind one key{HAS_LIST ? <>, {under} of them priced under their maker&apos;s list</> : null}. Video and music are coming soon.</p>
              <Link href="/console/models" className={s.btn}>See every model</Link>
            </div>
          </section>
          <section className={`${s.c} ${s.siC} ${s.isKeys}`} aria-labelledby="si-keys">
            <div className={s.art}>{[TILES.key, TILES.cap, TILES.gauge].map((a, i) => <span key={i} className={s.tile}><Pix art={a} cell={7} gap={2} /></span>)}</div>
            <h2 id="si-keys">A key per app</h2>
            <p className={s.lbl}>Each key gets its own spend cap, expiry and model list.</p>
          </section>
          <section className={`${s.c} ${s.siC} ${s.isUsage}`} aria-labelledby="si-usage">
            <div className={s.art}>
              <span className={`${s.tile} ${s.bars}`}><Pix art={TILES.bars} cell={5} gap={2} /></span>
              <span className={`${s.tile} ${s.rowsT}`}><Pix art={TILES.rows} cell={5} gap={1} /></span>
            </div>
            <h2 id="si-usage">Spend you can read</h2>
            <p className={s.lbl}>Every call shows what it cost, without its prompt or reply.</p>
          </section>
          <section className={`${s.c} ${s.siC} ${s.isPrivate}`} aria-labelledby="si-private">
            <span className={`${s.tile} ${s.tileSm}`}><Pix art={TILES.private} /></span>
            <div>
              <h2 id="si-private">No copy of your prompts</h2>
              <p className={s.lbl} style={{ marginTop: 5 }}>Wisp strips who you are before the host sees a request, and keeps only a billing row tied to your account, deleted after 30 days.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Renders children only when signed in; otherwise the sign-in page. */
export function Gate({ children, title, sub }: { children: (me: Me) => React.ReactNode; title: string; sub: string }) {
  const { me } = useConsoleMe();
  if (me === undefined) return <p className={s.dim}>Loading…</p>;
  if (me === null) return <SignInPage title={title} sub={sub} />;
  return <>{children(me)}</>;
}

/** Last 30 UTC days, filled with zeros where there were no calls. */
export function last30(byDay: Row[]) {
  const map = new Map(byDay.map((d) => [d.k, d]));
  return Array.from({ length: 30 }, (_, i) => {
    const k = new Date(Date.now() - (29 - i) * 86400_000).toISOString().slice(0, 10);
    const d = map.get(k);
    return { k, cost: d?.cost ?? 0, list: d?.list ?? 0, calls: d?.calls ?? 0 };
  });
}

export function SpendBars({ days, height = 140 }: { days: { k: string; cost: number; list: number; calls: number }[]; height?: number }) {
  const max = Math.max(...days.map((d) => d.list), 1e-9);
  const w = 100 / days.length;
  const total = days.reduce((a, d) => a + d.cost, 0);
  return (
    <div>
      <svg className={s.chart} style={{ height }} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Spend over 30 days: ${usd(total)}`}>
        {days.map((d, i) => (
          <g key={d.k}>
            <title>{`${d.k}: ${usd(d.cost)} charged${HAS_LIST ? `, ${usd(d.list)} at list` : ""}, ${d.calls} calls`}</title>
            {HAS_LIST && <rect x={i * w + w * 0.15} width={w * 0.7} y={100 - (d.list / max) * 100} height={(d.list / max) * 100} fill="#ffffff1f" />}
            <rect x={i * w + w * 0.15} width={w * 0.7} y={100 - (d.cost / max) * 100} height={(d.cost / max) * 100} fill="var(--room)" />
          </g>
        ))}
      </svg>
      <div className={s.between} style={{ marginTop: 6 }}>
        <div className={s.legend}>
          <span><i className={s.sw} style={{ background: "var(--room)" }} />Charged</span>
          {HAS_LIST && <span><i className={s.sw} style={{ background: "#ffffff1f" }} />At list</span>}
        </div>
        <span className={s.dim} style={{ fontSize: 11, fontFamily: "var(--mono)" }}>{days[0]?.k.slice(5)} → {days.at(-1)?.k.slice(5)}</span>
      </div>
    </div>
  );
}

const q = (v: string) => v.replace(/'/g, "'\\''");

/** curl / Python / JS for one model, against this server's /v1. */
export function snippets(m: Model, base: string, o: { prompt?: string; system?: string; temperature?: number; max_tokens?: number } = {}) {
  const prompt = o.prompt || (m.kind === "chat" ? "Hello" : m.kind === "image" ? "a paper lantern over a dark river" : "slow evening ambience");
  if (m.kind === "chat") {
    const messages = [...(o.system ? [{ role: "system", content: o.system }] : []), { role: "user", content: prompt }];
    const body = { model: m.id, messages, ...(o.temperature != null ? { temperature: o.temperature } : {}), max_tokens: o.max_tokens ?? 512 };
    const py = JSON.stringify(messages);
    const extra = (sep: string, eq: string) => `${o.temperature != null ? `${sep}temperature${eq}${o.temperature}` : ""}${sep}max_tokens${eq}${body.max_tokens}`;
    return [
      { label: "curl", code: `curl ${base}/chat/completions \\\n  -H "Authorization: Bearer YOUR_WISP_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${q(JSON.stringify(body, null, 2))}'` },
      { label: "Python", code: `from openai import OpenAI\n\nclient = OpenAI(base_url="${base}", api_key="YOUR_WISP_KEY")\n\nr = client.chat.completions.create(\n    model="${m.id}",\n    messages=${py}${extra(",\n    ", "=")},\n)\nprint(r.choices[0].message.content)` },
      { label: "JavaScript", code: `import OpenAI from "openai";\n\nconst client = new OpenAI({ baseURL: "${base}", apiKey: "YOUR_WISP_KEY" });\n\nconst r = await client.chat.completions.create({\n  model: "${m.id}",\n  messages: ${JSON.stringify(messages)}${extra(",\n  ", ": ")},\n});\nconsole.log(r.choices[0].message.content);` },
    ];
  }
  const body = JSON.stringify({ model: m.id, prompt });
  return [
    { label: "curl", code: `# start the job\ncurl ${base}/jobs \\\n  -H "Authorization: Bearer YOUR_WISP_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${q(body)}'\n\n# poll until "status" is "succeeded", then fetch the file\ncurl ${base}/jobs/JOB_ID -H "Authorization: Bearer YOUR_WISP_KEY"\ncurl ${base}/jobs/JOB_ID/content -H "Authorization: Bearer YOUR_WISP_KEY" -o out` },
    { label: "Python", code: `import time, requests\n\nH = {"Authorization": "Bearer YOUR_WISP_KEY"}\njob = requests.post("${base}/jobs", headers=H, json=${body}).json()\nwhile (s := requests.get(f"${base}/jobs/{job['id']}", headers=H).json())["status"] not in ("succeeded", "failed"):\n    time.sleep(1.5)\nopen("out", "wb").write(requests.get(f"${base}/jobs/{job['id']}/content", headers=H).content)` },
    { label: "JavaScript", code: `const H = { Authorization: "Bearer YOUR_WISP_KEY", "Content-Type": "application/json" };\nconst job = await (await fetch("${base}/jobs", { method: "POST", headers: H, body: JSON.stringify(${body}) })).json();\nlet s;\ndo {\n  await new Promise((r) => setTimeout(r, 1500));\n  s = await (await fetch(\`${base}/jobs/\${job.id}\`, { headers: H })).json();\n} while (s.status !== "succeeded" && s.status !== "failed");\nconst file = await (await fetch(\`${base}/jobs/\${job.id}/content\`, { headers: H })).blob();` },
  ];
}

/** window.location.origin + "/v1", after mount (SSR-safe). */
export function useBase() {
  const [b, setB] = useState("/v1"); // never a dev host in the server-rendered snippet
  useEffect(() => setB(location.origin + "/v1"), []);
  return b;
}
