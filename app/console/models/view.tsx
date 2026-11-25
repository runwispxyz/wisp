"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, KIND_ART, MARKS, Pix } from "@/components/console/art";
import { Card, Head, KCLS, s } from "@/components/console/ui";
import { HAS_LIST, MODELS, SHOWN_KINDS, discount, isSoon, priceLabel, unitLabel, usd, type Kind } from "@/lib/models";

const KINDS: Kind[] = SHOWN_KINDS;
const UNIT: Record<Kind, string> = { chat: "per 1M tokens in", image: "per image", video: "per second", music: "per song" };
const makers = [...new Set(MODELS.map((m) => m.maker))].sort();

export default function Models() {
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [maker, setMaker] = useState("");
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [sort, setSort] = useState<"discount" | "price" | "name">(HAS_LIST ? "discount" : "price");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [q, setQ] = useState("");
  const find = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = new URLSearchParams(location.search).get("kind") as Kind | null;
    if (k && KINDS.includes(k)) setKind(k);
    const on = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof Element && e.target.closest("input, textarea, select"))) { e.preventDefault(); find.current?.focus(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  const pick = (k: "all" | Kind) => { setKind(k); history.replaceState(null, "", k === "all" ? "?" : `?kind=${k}`); };

  const rows = MODELS.filter((m) => (kind === "all" || m.kind === kind) && (!maker || m.maker === maker) && (!onlyDiscount || discount(m)) && `${m.name} ${m.id} ${m.maker}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === "price" ? a.price[0] - b.price[0] : sort === "discount" ? (discount(b) ?? -1) - (discount(a) ?? -1) : a.name.localeCompare(b.name));
  const under = MODELS.filter((m) => discount(m)).length;
  const half = MODELS.filter((m) => (discount(m) ?? 0) >= 50).length;
  const cheapest = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, Math.min(...MODELS.filter((m) => m.kind === k).map((m) => m.price[0]))])), []);

  return (
    <>
      <Head art="models" title="Models" sub={`${MODELS.length} models from ${makers.length} makers on one key${HAS_LIST ? `, ${under} of them priced under their maker's list` : ""}.`}>
        <Link href="/console/playground" className={`${s.btn} ${s.lit}`}>Open playground</Link>
      </Head>

      <div className={s.bento}>
        <Card star title="Find a model" note="By name, ID or maker, or pick a kind" className={`${s.s8} ${s.r2}`}>
          <span className={s.big}><Pix art={MARKS.models} cell={18} gap={4} /></span>
          <label className={s.findBox}>
            <span className="sr">Search models</span>
            <Icon name="search" size={14} />
            <input ref={find} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, ID or maker" />
            <kbd>/</kbd>
          </label>
          <div className={s.mkinds}>
            <button type="button" className={s.mkind} aria-pressed={kind === "all"} onClick={() => pick("all")}>
              <span className={s.mkindT}><Pix art={MARKS.dashboard} cell={2} gap={0} /><b>All</b><i>{MODELS.length}</i></span>
              <em>{makers.length} makers</em><small>one key</small>
            </button>
            {KINDS.map((k) => (
              <button key={k} type="button" className={`${s.mkind} ${KCLS[k]}`} aria-pressed={kind === k} onClick={() => pick(k)}>
                <span className={s.mkindT}><Pix art={KIND_ART[k]} cell={2} gap={1} /><b>{k}</b><i>{isSoon(k) ? "soon" : MODELS.filter((m) => m.kind === k).length}</i></span>
                {isSoon(k) ? <><em>coming soon</em><small>nothing charged yet</small></> : <><em>from {usd(cheapest[k])}</em><small>{UNIT[k]}</small></>}
              </button>
            ))}
          </div>
        </Card>
        {HAS_LIST && <Card title="Under list price" className={s.s4}>
          <div className={s.between} style={{ alignItems: "flex-end" }}>
            <p className={s.fig}>{under}<small>of {MODELS.length}</small></p>
            <p className={s.lbl}>{half} cost half of list or less</p>
          </div>
        </Card>}
        <Card title="Free to try" note="No wallet needed" className={s.s4}>
          <p className={s.lbl}>{MODELS.filter((m) => m.free).map((m) => m.name).join(", ") || "None right now"}.</p>
        </Card>
      </div>

      <section className={s.sect} aria-labelledby="all-h">
        <div className={s.bar}>
          <h2 id="all-h">{rows.length === MODELS.length ? `All ${MODELS.length} models` : `${rows.length} of ${MODELS.length} models`}</h2>
          <div className={s.barEnd}>
            {HAS_LIST && <label className={s.check}><input type="checkbox" checked={onlyDiscount} onChange={(e) => setOnlyDiscount(e.target.checked)} />Under list only</label>}
            <select className={s.pick} value={maker} onChange={(e) => setMaker(e.target.value)} aria-label="Maker">
              <option value="">Any maker</option>{makers.map((m) => <option key={m}>{m}</option>)}
            </select>
            <select className={s.pick} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
              {HAS_LIST && <option value="discount">Biggest saving first</option>}<option value="price">Cheapest first</option><option value="name">By name</option>
            </select>
            <span className={s.seg} role="group" aria-label="View">
              <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")}>Cards</button>
              <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
            </span>
          </div>
        </div>

        {view === "cards" ? (
          <ul className={s.cards} style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((m) => (
              <li key={m.id} className={KCLS[m.kind]}>
                <Link href={`/console/models/${m.id}`} className={s.card}>
                  <span className={s.cardBig}><Pix art={KIND_ART[m.kind]} cell={20} gap={4} /></span>
                  <span className={s.cardHead}>
                    <span className={s.tile}><Pix art={KIND_ART[m.kind]} cell={5} gap={1} /></span>
                    <span className={s.cardWho}>
                      <span className={s.cardName}>{m.name}</span>
                      <span className={s.cardBy}>{m.maker}<i />{m.kind}{m.context ? <><i />{Math.round(m.context / 1000)}K</> : null}</span>
                    </span>
                  </span>
                  <code className={s.cardId}>{m.id}</code>
                  <span className={s.cardPrice}>
                    <span style={{ display: "grid", gap: 2, marginTop: 6 }}><b>{priceLabel(m)}</b><span style={{ fontSize: 11.5, color: "#7e7e7e" }}>{unitLabel(m)}</span></span>
                    <span className={s.tags}>
                      {discount(m) ? <em className={s.save}>−{discount(m)}%</em> : null}
                      {m.free && <em className={s.tag}>Free trial</em>}
                      {m.demo && <em className={s.tag}>Demo</em>}
                    </span>
                  </span>
                  {m.list ? <s className={s.cardList}>{priceLabel(m, true)} at list</s> : null}
                </Link>
              </li>
            ))}
            {!rows.length && <li className={s.empty}>{kind !== "all" && isSoon(kind) ? `${kind[0].toUpperCase() + kind.slice(1)} models are coming soon.` : "No model matches."}</li>}
          </ul>
        ) : (
          <Card label="Models">
            <div className={s.tblWrap} style={{ marginTop: -18 }}>
              <table className={s.tbl}>
                <thead><tr><th>Model</th><th>Kind</th><th>Wisp price</th>{HAS_LIST && <><th>List</th><th>Saving</th></>}<th>Context</th></tr></thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id}>
                      <td><Link href={`/console/models/${m.id}`} style={{ fontWeight: 500 }}>{m.name}</Link><div className={s.dim} style={{ fontSize: 11.5, fontFamily: "var(--mono)" }}>{m.maker} · {m.id}</div></td>
                      <td style={{ textTransform: "capitalize" }}>{m.kind}{m.demo && <span className={s.chip} style={{ marginLeft: 6 }}>demo</span>}</td>
                      <td>{priceLabel(m)}<div className={s.dim} style={{ fontSize: 11.5 }}>{unitLabel(m)}</div></td>
                      {HAS_LIST && <><td><span className={m.list ? s.strike : s.dim}>{priceLabel(m, true)}</span></td>
                      <td>{discount(m) ? <span className={s.up}>−{discount(m)}%</span> : <span className={s.dim}>—</span>}</td></>}
                      <td>{m.context ? `${Math.round(m.context / 1000)}K` : "—"}</td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={HAS_LIST ? 6 : 4} className={s.empty}>{kind !== "all" && isSoon(kind) ? `${kind[0].toUpperCase() + kind.slice(1)} models are coming soon.` : "No model matches."}</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </>
  );
}
