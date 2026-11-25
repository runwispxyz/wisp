"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { KIND_ART, Pix } from "@/components/console/art";
import { Card, CodeTabs, Copy, Head, s, snippets as snippetsFor, useBase } from "@/components/console/ui";
import { chatCost, discount, fromMicro, getModel, mediaCost, priceLabel, unitLabel, usd } from "@/lib/models";

export default function ModelPage() {
  const { id } = useParams<{ id: string }>();
  const m = getModel(decodeURIComponent(id));
  const base = useBase();
  const [tin, setTin] = useState(1500);
  const [tout, setTout] = useState(500);
  const [units, setUnits] = useState(1);
  const [perDay, setPerDay] = useState(100);

  if (!m) return (
    <>
      <Head art="models" title="Model not found" sub={`There is no model called “${id}”.`} />
      <Link href="/console/models" className={s.btn}>All models</Link>
    </>
  );

  const per = (list: boolean) => {
    const c = m.kind === "chat" ? chatCost(m, tin, tout, list) : mediaCost(m, units, list);
    return c == null ? null : fromMicro(c);
  };
  const a = per(false)!, l = per(true);
  const d = discount(m);
  const unitName = m.unit === "second" ? "Seconds per call" : m.unit === "song" ? "Songs per call" : "Images per call";
  const ctx = m.context ? `${Math.round(m.context / 1000)}K` : null;

  return (
    <>
      <nav className={s.crumb} aria-label="Breadcrumb">
        <Link href="/console/models">Models</Link><i /><b aria-current="page">{m.name}</b>
        <span className={s.crumbEnd}>{m.demo ? "Demo model" : "Ready"}</span>
      </nav>

      <div className={s.bento}>
        <article className={`${s.c} ${s.col} ${s.star} ${s.s8}`} style={{ padding: "24px 26px" }} aria-labelledby="m-h">
          <span className={`${s.big} ${s.bigBr}`}><Pix art={KIND_ART[m.kind]} cell={32} gap={4} /></span>
          <header className={s.mhead}>
            <span className={`${s.tile} ${s.tileLg}`}><Pix art={KIND_ART[m.kind]} cell={8} gap={1} /></span>
            <div>
              <h1 id="m-h">{m.name}</h1>
              <p>A {m.kind} model by {m.maker}{ctx ? ` with a ${ctx} context window` : ""}.</p>
            </div>
          </header>
          <div className={s.mid}>
            <Copy text={m.id} label={m.id} className={s.pill} />
            {m.free && <span className={`${s.chip} ${s.chipLit}`}>Free trial</span>}
            {m.vision && <span className={s.chip}>Reads images</span>}
            {m.demo && <span className={`${s.chip} ${s.chipWarn} ${s.dot}`}>Demo, no provider yet</span>}
          </div>
          <div className={s.mprice}>
            <div>
              <p className={`${s.fig} ${s.figXl}`}>{priceLabel(m)}</p>
              <p className={s.lbl} style={{ marginTop: 8 }}>{unitLabel(m)}</p>
            </div>
            <div className={s.mvs}>
              {m.list ? <><span className={`${s.chip} ${s.chipRoom}`}>{d}% under list</span><s className={s.cardList}>{priceLabel(m, true)} at list</s></>
                : null}
            </div>
          </div>
          <p className={s.mpriv}>Wisp removes your wallet, IP and device before the call, so the host sees the prompt and never who sent it. Wisp keeps no prompts or replies.</p>
          <div className={s.macts}>
            <Link href={`/console/playground?model=${m.id}`} className={`${s.btn} ${s.lit} ${s.lg}`}>Try it in the playground</Link>
            <Copy text={m.id} label="Copy the model ID" className={`${s.btn} ${s.lg}`} />
          </div>
        </article>

        <Card title="Facts" className={s.s4}>
          <dl className={s.facts}>
            {ctx && <div><dt>Context window</dt><dd>{ctx} tokens</dd></div>}
            <div><dt>Endpoint</dt><dd className={s.mono}>{m.kind === "chat" ? "POST /v1/chat/completions" : "POST /v1/jobs"}</dd></div>
            <div><dt>Kind</dt><dd style={{ textTransform: "capitalize" }}>{m.kind}</dd></div>
            <div><dt>Maker</dt><dd>{m.maker}</dd></div>
            <div><dt>Model ID</dt><dd className={s.mono}>{m.id}</dd></div>
            <div><dt>Free trial</dt><dd>{m.free ? "Yes, without a wallet" : "No"}</dd></div>
          </dl>
        </Card>

        <Card title="What a workload costs" note={`At ${priceLabel(m)} ${unitLabel(m)}`} className={s.s5}>
          <div className={s.bento} style={{ marginBottom: 14 }}>
            {m.kind === "chat" ? (
              <>
                <label className={s.s4}><span className={s.label}>Tokens in</span><input className={s.input} type="number" min={0} value={tin} onChange={(e) => setTin(Math.max(0, +e.target.value))} /></label>
                <label className={s.s4}><span className={s.label}>Tokens out</span><input className={s.input} type="number" min={0} value={tout} onChange={(e) => setTout(Math.max(0, +e.target.value))} /></label>
              </>
            ) : (
              <label className={s.s8}><span className={s.label}>{unitName}</span><input className={s.input} type="number" min={0} value={units} onChange={(e) => setUnits(Math.max(0, +e.target.value))} /></label>
            )}
            <label className={s.s4}><span className={s.label}>Calls a day</span><input className={s.input} type="number" min={0} value={perDay} onChange={(e) => setPerDay(Math.max(0, +e.target.value))} /></label>
          </div>
          <div className={s.tblWrap}>
            <table className={s.tbl}>
              <thead><tr><th></th><th>With Wisp</th>{l != null && <><th>At list</th><th>You save</th></>}</tr></thead>
              <tbody>
                {([["Per call", 1], ["Per day", perDay], ["30 days", perDay * 30]] as const).map(([label, x]) => (
                  <tr key={label}>
                    <td className={s.muted}>{label}</td>
                    <td>{usd(a * x)}</td>
                    {l != null && <><td><span className={s.strike}>{usd(l * x)}</span></td>
                    <td className={s.up}>{usd((l - a) * x)}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Call it from your code" note="Set the base URL and your key" className={s.s7} end={<Link href="/console/keys#new" className={s.link}>Create a key</Link>}>
          <CodeTabs tabs={snippetsFor(m, base)} />
          {m.kind === "chat" && <p className={`${s.lbl} ${s.note}`} style={{ marginTop: 12 }}>Any OpenAI SDK works: point its base URL at Wisp and pass your Wisp key as the API key.</p>}
        </Card>
      </div>
    </>
  );
}
