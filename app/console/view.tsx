"use client";
import Link from "next/link";
import { Card, Copy, ErrorNote, Head, SignInPage, SpendBars, Stat, last30, num, s, useApi, useConsoleMe, when, type Call, type Usage } from "@/components/console/ui";
import type { Me } from "@/lib/client";
import { HAS_LIST, getModel, usd } from "@/lib/models";

export default function Dashboard() {
  const { me } = useConsoleMe();
  if (me === undefined) return <p className={s.dim}>Loading…</p>;
  return me ? <SignedIn me={me} /> : <SignInPage title="Dashboard" sub="Sign in to see your balance, what you spent and every call you made." />;
}

function SignedIn({ me }: { me: Me }) {
  const usage = useApi<Usage>("/api/usage");
  const act = useApi<{ calls: Call[] }>("/api/activity");
  const h = me.holder;
  const pct = me.last30.list ? Math.round((me.last30.saved / me.last30.list) * 100) : 0;
  return (
    <>
      <Head art="dashboard" title="Dashboard" sub="The last 30 days on this wallet.">
        <Link href="/console/credit#add" className={s.btn}>Add credit</Link>
        <Link href="/console/playground" className={`${s.btn} ${s.lit}`}>Open playground</Link>
      </Head>

      <div className={s.bento}>
        <Card title="Balance" note="Pays for every call" star className={`${s.s6} ${s.r2}`}>
          <p className={`${s.fig} ${s.figXl}`}>{usd(me.balance, 2)}</p>
          <p className={`${s.lbl} ${s.note}`}>{me.mockChain ? "Mock chain: deposits are simulated on the Credit page." : "Top up with USDG or $WISP on Robinhood Chain."}</p>
          <div className={s.row} style={{ marginTop: "auto", paddingTop: 18 }}>
            <Link href="/console/credit#add" className={`${s.btn} ${s.lit}`}>Add credit</Link>
            <Link href="/console/credit#redeem" className={s.btn}>Redeem a code</Link>
          </div>
        </Card>
        {HAS_LIST && <Stat label="Saved vs list" value={usd(me.last30.saved)} tone="up" note={me.last30.list ? `${pct}% under list` : "No calls yet"} />}
        <Stat label="Spent" note={HAS_LIST ? `${usd(me.last30.list)} at list` : "Last 30 days"} value={usd(me.last30.spent)} />
        <Stat label="Calls" value={num(me.last30.calls)} note="Settled, 30 days" />
        <Card title="Holder Credit" className={s.s3} end={<span className={`${s.chip} ${h.eligible ? s.chipLit : ""}`}>{h.pool <= 0 ? "Planned" : h.eligible ? "Earning" : "Not eligible"}</span>}>
          <dl className={`${s.facts} ${s.factsTight}`}>
            <div><dt>Held</dt><dd>{num(h.tokens)}</dd></div>
            <div><dt>Earned</dt><dd className={s.up}>{usd(h.earned)}</dd></div>
          </dl>
        </Card>

        <Card title="Spend by day" note="Charged against list" className={s.s8} end={<Link href="/console/usage" className={s.link}>Usage</Link>}>
          <ErrorNote error={usage.error} />
          {usage.data && <SpendBars days={last30(usage.data.byDay)} height={120} />}
        </Card>
        <Card title="Deposit address" note="Robinhood Chain" className={s.s4}>
          <div className={s.addr}>{me.depositAddress}</div>
          <div className={s.row} style={{ marginTop: 12 }}>
            <Copy text={me.depositAddress} label="Copy address" className={`${s.btn} ${s.sm}`} />
            {me.mockChain && <span className={`${s.chip} ${s.chipWarn}`}>Mock chain</span>}
          </div>
        </Card>

        <Card title="Recent calls" note="Newest first" className={s.s12} end={<Link href="/console/logs" className={s.link}>All logs</Link>}>
          <ErrorNote error={act.error} />
          {act.data && (act.data.calls.length ? (
            <div className={s.tblWrap}>
              <table className={s.tbl}>
                <thead><tr><th>Time</th><th>Model</th><th>Charged</th>{HAS_LIST && <th>At list</th>}<th>Status</th></tr></thead>
                <tbody>
                  {act.data.calls.slice(0, 6).map((c) => (
                    <tr key={c.id}>
                      <td className={s.dim}>{when(c.created)}</td>
                      <td><Link href={`/console/models/${c.model}`}>{getModel(c.model)?.name ?? c.model}</Link></td>
                      <td>{usd(c.cost)}</td>
                      {HAS_LIST && <td>{c.list_cost == null ? <span className={s.dim}>—</span> : <span className={s.strike}>{usd(c.list_cost)}</span>}</td>}
                      <td className={c.status === "failed" || c.status === "refunded" ? s.down : s.muted}>{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className={s.empty}>No calls yet. <Link href="/console/playground" className={s.link}>Try a model</Link></p>)}
        </Card>
      </div>
    </>
  );
}
