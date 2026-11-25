"use client";
import { useState } from "react";
import { Card, ErrorNote, Gate, Head, num, s, useApi, when, type Call } from "@/components/console/ui";
import { HAS_LIST, getModel, usd } from "@/lib/models";

const COLS: [string, (c: Call) => unknown][] = [
  ["time", (c) => new Date(c.created).toISOString()], ["model", (c) => c.model], ["kind", (c) => c.kind], ["source", (c) => c.source], ["key", (c) => c.key ?? ""],
  ["tokens_in", (c) => c.tok_in ?? ""], ["tokens_out", (c) => c.tok_out ?? ""], ["units", (c) => c.units ?? ""],
  ["held_usd", (c) => c.held], ["charged_usd", (c) => c.cost], ["list_usd", (c) => c.list_cost ?? ""], ["status", (c) => c.status],
];
const csvCell = (v: unknown) => { const t = String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

export default function Logs() {
  return <Gate title="Logs" sub="Sign in to see every call made with your wallet and keys.">{() => <Inner />}</Gate>;
}

function Inner() {
  const a = useApi<{ calls: Call[] }>("/api/activity");
  const [status, setStatus] = useState("");
  const [model, setModel] = useState("");
  const calls = a.data?.calls ?? [];
  const statuses = [...new Set(calls.map((c) => c.status))];
  const models = [...new Set(calls.map((c) => c.model))];
  const rows = calls.filter((c) => (!status || c.status === status) && (!model || c.model === model));

  const exportCsv = () => {
    const text = [COLS.map((c) => c[0]).join(","), ...rows.map((r) => COLS.map(([, f]) => csvCell(f(r))).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `wisp-logs-${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head art="logs" title="Logs" sub="Your calls from the last 30 days, up to 200. Wisp keeps one billing row per call, never the prompt or the reply, and deletes rows after 30 days.">
        <button className={s.btn} onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
        <button className={`${s.btn} ${s.quiet}`} onClick={a.reload}>Refresh</button>
      </Head>
      <ErrorNote error={a.error} />
      <div className={s.bar}>
        <h2>{rows.length === calls.length ? `All ${calls.length} calls` : `${rows.length} of ${calls.length} calls`}</h2>
        <div className={s.barEnd}>
          <select className={s.pick} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">Any status</option>{statuses.map((x) => <option key={x}>{x}</option>)}
          </select>
          <select className={s.pick} value={model} onChange={(e) => setModel(e.target.value)} aria-label="Filter by model">
            <option value="">Any model</option>{models.map((x) => <option key={x} value={x}>{getModel(x)?.name ?? x}</option>)}
          </select>
        </div>
      </div>
      <Card label="Calls">
        <div className={s.tblWrap} style={{ marginTop: -18 }}>
          <table className={s.tbl}>
            <thead><tr><th>Time</th><th>Model</th><th>Kind</th><th>Source</th><th>Key</th><th>Tokens / units</th><th>Held</th><th>Charged</th>{HAS_LIST && <th>List</th>}<th>Status</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className={s.dim}>{when(c.created)}</td>
                  <td>{getModel(c.model)?.name ?? c.model}</td>
                  <td style={{ textTransform: "capitalize" }}>{c.kind}</td>
                  <td><span className={s.chip}>{c.source}</span></td>
                  <td>{c.key ? <span className={s.pill}>{c.key}</span> : <span className={s.dim}>—</span>}</td>
                  <td>{c.kind === "chat" ? `${num(c.tok_in)} / ${num(c.tok_out)}` : num(c.units)}</td>
                  <td className={s.dim}>{usd(c.held)}</td>
                  <td>{usd(c.cost)}</td>
                  {HAS_LIST && <td>{c.list_cost == null ? <span className={s.dim}>—</span> : <span className={s.strike}>{usd(c.list_cost)}</span>}</td>}
                  <td className={c.status === "failed" || c.status === "refunded" ? s.down : c.status === "settled" ? "" : s.dim}>{c.status}</td>
                </tr>
              ))}
              {a.data && !rows.length && <tr><td colSpan={HAS_LIST ? 10 : 9} className={s.empty}>{calls.length ? "Nothing matches these filters." : "No calls yet."}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
