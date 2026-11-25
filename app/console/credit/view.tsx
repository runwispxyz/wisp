"use client";
import { useRef, useState } from "react";
import { Card, Copy, ErrorNote, Gate, Head, Stat, errMsg, num, s, useAction, useApi, when, type Deposit } from "@/components/console/ui";
import { api, refreshMe, type Me } from "@/lib/client";
import { HAS_LIST, usd } from "@/lib/models";

type Deps = { address: string; mockChain: boolean; scanError: string | null; deposits: Deposit[] };
const tokenName = (t: string) => (t === "TOKEN" ? "$WISP" : t);

export default function Credit() {
  return <Gate title="Credit" sub="Sign in to add credit to your balance or redeem a code.">{(me) => <Inner me={me} />}</Gate>;
}

function Inner({ me }: { me: Me }) {
  const deps = useApi<Deps>("/api/deposits");
  const [checking, setChecking] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const redeemRef = useRef<HTMLInputElement>(null);
  useAction("add", () => addRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  useAction("redeem", () => { redeemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); redeemRef.current?.focus({ preventScroll: true }); });

  const check = async () => { setChecking(true); await deps.reload(); refreshMe(); setChecking(false); };
  const changed = () => { deps.reload(); refreshMe(); };
  const h = me.holder;

  return (
    <>
      <Head art="credit" title="Credit" sub="Every call is paid from one balance. Top it up from your wallet on Robinhood Chain, or redeem a code." />
      <div className={s.bento}>
        <Stat star label="Balance" value={<span className={s.figXl}>{usd(me.balance, 2)}</span>} note="Ready to spend on any model" className={s.s6} />
        {HAS_LIST ? <Stat label="Saved vs list" value={usd(me.last30.saved)} tone="up" note="Last 30 days" /> : <Stat label="Spent" value={usd(me.last30.spent)} note="Last 30 days" />}
        <Stat label="Holder Credit earned" value={usd(h.earned)} tone="up" note={h.pool <= 0 ? "Planned, after launch" : h.eligible ? "Earning each hour" : "Not eligible yet"} />

        <div id="add" ref={addRef} className={s.s8} style={{ scrollMarginTop: 72, display: "grid" }}>
          <Card title="Add credit" note="USDG on Robinhood Chain" end={deps.data?.mockChain && <span className={`${s.chip} ${s.chipWarn}`}>Mock chain</span>}>
            <p className={s.lbl} style={{ marginBottom: 14 }}>Send USDG on Robinhood Chain to your own deposit address. It counts one to one in dollars and lands after about 20 blocks. $WISP sent here is recorded but waits for a manual review.</p>
            <div className={s.addr}>{me.depositAddress}</div>
            <div className={s.row} style={{ marginTop: 12 }}>
              <Copy text={me.depositAddress} label="Copy address" className={`${s.btn} ${s.lit}`} />
              <button className={s.btn} onClick={check} disabled={checking}>{checking ? "Checking…" : "Check for deposits"}</button>
            </div>
            <p className={`${s.lbl} ${s.note}`}>Send only on Robinhood Chain. A transfer on another network does not arrive here.</p>
            <div style={{ marginTop: 10 }}><ErrorNote error={deps.error || deps.data?.scanError} /></div>
          </Card>
        </div>
        <Redeem inputRef={redeemRef} />

        <Card title="Deposits" note="Newest first" className={s.s8}>
          <div className={s.tblWrap}>
            <table className={s.tbl}>
              <thead><tr><th>Time</th><th>Token</th><th>Amount</th><th>Credit</th><th>Status</th><th>Reference</th></tr></thead>
              <tbody>
                {deps.data?.deposits.map((d) => (
                  <tr key={d.ref}>
                    <td className={s.dim}>{when(d.created)}</td>
                    <td>{tokenName(d.token)}</td>
                    <td>{num(d.amount)}</td>
                    <td>{usd(d.credit, 2)}</td>
                    <td>{d.status === "credited" ? <span className={`${s.chip} ${s.chipLit}`}>credited</span> : <span className={`${s.chip} ${s.chipWarn}`}>{d.status}</span>}</td>
                    <td title={d.ref}><span className={s.pill}>{d.ref.slice(0, 10)}…</span></td>
                  </tr>
                ))}
                {deps.data && !deps.data.deposits.length && <tr><td colSpan={6} className={s.empty}>No deposits yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Holder Credit" className={s.s4} end={<span className={`${s.chip} ${h.eligible ? s.chipLit : ""}`}>{h.eligible ? "Eligible" : "Not eligible"}</span>}>
          <p className={s.lbl} style={{ marginBottom: 6 }}>{h.pool <= 0
            ? "Holder Credit is not switched on yet. Your $WISP balance is read from the chain and shown here."
            : h.price > 0
              ? `Wallets holding at least ${usd(h.min, 2)} of $WISP share an hourly pool of credit, added straight to the balance.`
              : `Wallets holding at least ${num(h.minTokens)} $WISP share an hourly pool of credit, added straight to the balance.`}</p>
          <dl className={`${s.facts} ${s.factsTight}`}>
            <div><dt>Tokens held</dt><dd>{num(h.tokens)}</dd></div>
            <div><dt>Value</dt><dd>{h.price > 0 ? <>{usd(h.valueUsd, 2)} <span className={s.dim}>at {usd(h.price)}</span></> : <span className={s.dim}>no price yet</span>}</dd></div>
            <div><dt>Hourly pool</dt><dd>{usd(h.pool, 2)}</dd></div>
            <div><dt>Earned</dt><dd className={s.up}>{usd(h.earned)}</dd></div>
            <div><dt>Last credit</dt><dd className={s.muted}>{h.lastHour != null ? when(h.lastHour * 3600_000) : "None yet"}</dd></div>
          </dl>
        </Card>

        {me.mockChain && <MockPanel tokens={h.tokens} onChange={changed} />}
      </div>
    </>
  );
}

function Redeem({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(undefined); setOk(undefined);
    try {
      const r = await api<{ added: number }>("/api/redeem", { method: "POST", json: { code } });
      setOk(`Added ${usd(r.added, 2)} to your balance.`); setCode(""); refreshMe();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Card id="redeem" title="Redeem a code" note="Gift or promo" className={s.s4}>
      <form onSubmit={submit} className={s.stack} style={{ scrollMarginTop: 72 }}>
        <label><span className={s.label}>Code</span>
          <input ref={inputRef} className={s.input} style={{ fontFamily: "var(--mono)" }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="ABCD1234" autoComplete="off" spellCheck={false} /></label>
        <div className={s.row}><button className={`${s.btn} ${s.lit}`} disabled={busy || !code.trim()}>Redeem</button>{ok && <span className={s.ok} role="status">{ok}</span>}</div>
        <ErrorNote error={error} />
      </form>
    </Card>
  );
}

function MockPanel({ tokens, onChange }: { tokens: number; onChange: () => void }) {
  const [token, setToken] = useState<"USDG" | "TOKEN">("USDG");
  const [amount, setAmount] = useState("10");
  const [hold, setHold] = useState(String(tokens));
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState<string>();
  const run = async (path: string, json: unknown, msg: string) => {
    setError(undefined); setOk(undefined);
    try { await api(path, { method: "POST", json }); setOk(msg); onChange(); } catch (e) { setError(errMsg(e)); }
  };
  return (
    <Card title="Mock chain" note="No chain RPC is set, so this server fakes the chain" className={s.s12} end={<span className={`${s.chip} ${s.chipWarn}`}>Test only · no real funds</span>}>
      <div className={s.bento}>
        <form className={`${s.stack} ${s.s6}`} style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); run("/api/deposits/mock", { token, amount: Number(amount) }, `Simulated ${amount} ${tokenName(token)} deposit.`); }}>
          <span className={s.label} style={{ margin: 0 }}>Simulate a deposit</span>
          <div className={s.row} style={{ flexWrap: "nowrap" }}>
            <select className={s.input} style={{ width: 120 }} value={token} onChange={(e) => setToken(e.target.value as "USDG" | "TOKEN")} aria-label="Token">
              <option value="USDG">USDG</option><option value="TOKEN">$WISP</option>
            </select>
            <input className={s.input} type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
            <button className={s.btn} style={{ height: 38 }}>Deposit</button>
          </div>
        </form>
        <form className={`${s.stack} ${s.s6}`} style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); run("/api/holding", { tokens: Number(hold) }, `Holding set to ${Number(hold).toLocaleString()} $WISP.`); }}>
          <span className={s.label} style={{ margin: 0 }}>Set this wallet&apos;s $WISP holding</span>
          <div className={s.row} style={{ flexWrap: "nowrap" }}>
            <input className={s.input} type="number" min={0} step="any" value={hold} onChange={(e) => setHold(e.target.value)} aria-label="Tokens held" />
            <button className={s.btn} style={{ height: 38 }}>Set</button>
          </div>
        </form>
      </div>
      <div style={{ marginTop: 10 }}>{ok && <span className={s.ok} role="status">{ok}</span>}<ErrorNote error={error} /></div>
    </Card>
  );
}
