"use client";
import Link from "next/link";
import { Card, ErrorNote, Gate, Head, SpendBars, Stat, last30, num, s, useApi, type Usage } from "@/components/console/ui";
import { HAS_LIST, getModel, usd } from "@/lib/models";

export default function UsagePage() {
  return <Gate title="Usage" sub="Sign in to see what you spent, by day and by model.">{() => <Inner />}</Gate>;
}

function Inner() {
  const u = useApi<Usage>("/api/usage");
  const days = u.data ? last30(u.data.byDay) : [];
  const t = days.reduce((a, d) => ({ cost: a.cost + d.cost, list: a.list + d.list, calls: a.calls + d.calls }), { cost: 0, list: 0, calls: 0 });
  const mc = Math.max(...days.map((d) => d.calls), 1);
  return (
    <>
      <Head art="usage" title="Usage" sub="The last 30 days, settled calls only. Days are in UTC." />
      <ErrorNote error={u.error} />
      {u.data && (
        <div className={s.bento}>
          <Stat star label="Charged" value={usd(t.cost)} note={`${num(t.calls)} calls`} />
          {HAS_LIST && <Stat label="At list" value={<span className={s.strike}>{usd(t.list)}</span>} note="What the makers list" />}
          {HAS_LIST && <Stat label="Saved" value={usd(t.list - t.cost)} tone="up" note={t.list ? `${Math.round(((t.list - t.cost) / t.list) * 100)}% under list` : "No calls yet"} />}
          <Stat label="Calls" value={num(t.calls)} note="Settled" />

          <Card title={HAS_LIST ? "Spend vs list" : "Spend"} note="By day" className={s.s8}>
            <SpendBars days={days} />
          </Card>
          <Card title="Calls" note="By day" className={s.s4}>
            <svg className={s.chart} style={{ height: 140 }} viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${t.calls} calls over 30 days`}>
              {days.map((d, i) => (
                <rect key={d.k} x={i * (100 / 30) + 0.5} width={100 / 30 - 1} y={100 - (d.calls / mc) * 100} height={(d.calls / mc) * 100} fill="var(--room)" opacity={0.7}><title>{`${d.k}: ${d.calls} calls`}</title></rect>
              ))}
            </svg>
          </Card>

          <Card title="By model" note="Most spend first" className={s.s12}>
            <div className={s.tblWrap}>
              <table className={s.tbl}>
                <thead><tr><th>Model</th><th>Calls</th><th>Tokens in</th><th>Tokens out</th><th>Units</th><th>Charged</th>{HAS_LIST && <><th>At list</th><th>Saved</th></>}</tr></thead>
                <tbody>
                  {[...u.data.byModel].sort((a, b) => b.cost - a.cost).map((r) => (
                    <tr key={r.k}>
                      <td><Link href={`/console/models/${r.k}`}>{getModel(r.k)?.name ?? r.k}</Link></td>
                      <td>{num(r.calls)}</td>
                      <td>{num(r.tok_in)}</td>
                      <td>{num(r.tok_out)}</td>
                      <td>{num(r.units)}</td>
                      <td>{usd(r.cost)}</td>
                      {HAS_LIST && <><td><span className={s.strike}>{usd(r.list)}</span></td>
                      <td className={s.up}>{usd(r.list - r.cost)}</td></>}
                    </tr>
                  ))}
                  {!u.data.byModel.length && <tr><td colSpan={8} className={s.empty}>No settled calls in the last 30 days.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
