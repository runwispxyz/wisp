"use client";
import { useEffect, useState } from "react";
import s from "./site.module.css";

type Status = {
  checked: number;
  services: { name: string; ok: boolean; note: string }[];
  models: { id: string; name: string; kind: string; demo: boolean; calls24h: number; failed24h: number; ok: boolean }[];
};

const Dot = ({ ok }: { ok: boolean }) => <span className={ok ? s.dot : s.dotDown} role="img" aria-label={ok ? "up" : "down"} />;

export function StatusBoard() {
  const [st, setSt] = useState<Status | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const load = () =>
      fetch("/api/status", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Status check failed (${r.status})`))))
        .then((j) => { setSt(j); setErr(""); }, (e) => setErr(e.message));
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  if (!st) return <p className={err ? "down" : "faint"}>{err || "Checking…"}</p>;
  const allOk = st.services.every((x) => x.ok) && st.models.every((x) => x.ok);
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="card" style={{ padding: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Dot ok={allOk} /><b>{allOk ? "Everything answers" : "Something is down"}</b>
        <span className="faint mono" style={{ fontSize: 12, marginLeft: "auto" }}>last checked {new Date(st.checked).toLocaleTimeString()}</span>
        {err && <span className="down" style={{ fontSize: 12 }}>{err}, showing the last result</span>}
      </div>
      <div className={s.grid2} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {st.services.map((x) => (
          <div key={x.name} className={`card ${s.tile}`} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Dot ok={x.ok} /><b>{x.name}</b><span className="faint" style={{ fontSize: 12, marginLeft: "auto" }}>{x.note || (x.ok ? "ok" : "down")}</span>
          </div>
        ))}
      </div>
      <div className={`card ${s.tableWrap}`}>
        <table className="t">
          <thead><tr><th></th><th>Model</th><th>Kind</th><th style={{ textAlign: "right" }}>Calls 24h</th><th style={{ textAlign: "right" }}>Failed 24h</th></tr></thead>
          <tbody>
            {st.models.map((m) => (
              <tr key={m.id}>
                <td><Dot ok={m.ok} /></td>
                <td>{m.name}{m.demo && <span className="pill" style={{ marginLeft: 8 }}>demo</span>}<br /><small className="mono faint">{m.id}</small></td>
                <td className="mono faint">{m.kind}</td>
                <td className="mono tabnum" style={{ textAlign: "right" }}>{m.calls24h}</td>
                <td className={`mono tabnum ${m.failed24h ? "down" : "faint"}`} style={{ textAlign: "right" }}>{m.failed24h}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
