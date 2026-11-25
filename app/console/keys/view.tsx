"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/console/art";
import { Card, Copy, ErrorNote, Gate, Head, Stat, errMsg, s, useAction, useApi, useBase, when, type Key } from "@/components/console/ui";
import { api } from "@/lib/client";
import { MODELS, usd } from "@/lib/models";

type Form = { name: string; cap: string; expiresDays: string; all: boolean; models: string[] };
const blank: Form = { name: "", cap: "20", expiresDays: "", all: true, models: [] };

export default function Keys() {
  return <Gate title="Keys" sub="Sign in to make API keys and cap what each one can spend.">{() => <KeysInner />}</Gate>;
}

function KeysInner() {
  const keys = useApi<{ keys: Key[] }>("/api/keys");
  const base = useBase();
  const dlg = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Key | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState<number | null>(null);
  const [revokeError, setRevokeError] = useState<string>();
  const [showRevoked, setShowRevoked] = useState(false);

  const open = (k: Key | null) => {
    setEditing(k); setCreated(null); setError(undefined);
    setForm(k ? { name: k.name, cap: k.cap == null ? "" : String(k.cap), expiresDays: "", all: !k.models.length, models: k.models } : blank);
    if (!dlg.current?.open) dlg.current?.showModal();
    setTimeout(() => dlg.current?.querySelector<HTMLInputElement>("input")?.focus());
  };
  useAction("new", () => open(null));
  // An account with no keys yet opens on the form.
  const first = useRef(true);
  useEffect(() => {
    if (keys.data && first.current) { first.current = false; if (!keys.data.keys.length) open(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    const cap = form.cap.trim() === "" ? null : Number(form.cap);
    if (cap != null && !(cap >= 0)) { setError("Spend cap must be a number, or empty for no cap"); setBusy(false); return; }
    const models = form.all ? [] : form.models;
    if (!form.all && !models.length) { setError("Pick at least one model, or allow all models"); setBusy(false); return; }
    try {
      if (editing) {
        await api(`/api/keys/${editing.id}`, { method: "PATCH", json: { name: form.name, cap, models } });
        dlg.current?.close();
      } else {
        const r = await api<{ key: string }>("/api/keys", { method: "POST", json: { name: form.name, cap, expiresDays: form.expiresDays ? Number(form.expiresDays) : null, models } });
        setCreated(r.key);
      }
      keys.reload();
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }

  async function revoke(id: number) {
    setRevokeError(undefined);
    try { await api(`/api/keys/${id}`, { method: "DELETE" }); setConfirm(null); keys.reload(); } catch (e) { setRevokeError(errMsg(e)); }
  }

  const list = keys.data?.keys.filter((k) => showRevoked || !k.revoked) ?? [];
  const revokedCount = keys.data?.keys.filter((k) => k.revoked).length ?? 0;
  const toggle = (id: string) => setForm((f) => ({ ...f, models: f.models.includes(id) ? f.models.filter((x) => x !== id) : [...f.models, id] }));

  const live = keys.data?.keys.filter((k) => !k.revoked) ?? [];
  const spent = live.reduce((a, k) => a + k.spent, 0);
  const lastUsed = Math.max(0, ...live.map((k) => k.lastUsed ?? 0));

  return (
    <>
      <Head art="keys" title="Keys" sub="Give each app or agent its own key, with its own spend cap, expiry and list of models. Revoking one never touches your balance.">
        {revokedCount > 0 && <label className={s.check}><input type="checkbox" checked={showRevoked} onChange={(e) => setShowRevoked(e.target.checked)} />Show revoked ({revokedCount})</label>}
        <button className={`${s.btn} ${s.lit}`} onClick={() => open(null)}>New key <span className={`${s.kbd} ${s.kbdLit}`}>N</span></button>
      </Head>
      <ErrorNote error={keys.error || revokeError} />

      <div className={s.bento}>
        <Stat star label="Live keys" value={live.length} note={`${live.filter((k) => k.cap != null).length} with a spend cap`} className={s.s4} />
        <Stat label="Spent through keys" value={usd(spent)} note="Since each key was made" className={s.s4} />
        <Stat label="Last used" value={<span className={s.figSm}>{lastUsed ? when(lastUsed) : "Never"}</span>} note="Across all live keys" className={s.s4} />

        <Card title="Your keys" note={`${list.length} shown`} className={s.s12}>
          <div className={s.tblWrap}>
            <table className={s.tbl}>
              <thead><tr><th>Name</th><th>Key</th><th>Spent of cap</th><th>Models</th><th>Created</th><th>Last used</th><th>Expires</th><th></th></tr></thead>
              <tbody>
                {list.map((k) => {
                  const pct = k.cap ? Math.min(100, (k.spent / k.cap) * 100) : 0;
                  const expired = k.expires != null && k.expires < Date.now();
                  return (
                    <tr key={k.id} style={k.revoked ? { opacity: 0.5 } : undefined}>
                      <td><span style={{ fontWeight: 500 }}>{k.name}</span>{" "}
                        {k.revoked ? <span className={s.chip}>revoked</span> : expired ? <span className={`${s.chip} ${s.chipRisk}`}>expired</span> : k.cap === 0 ? <span className={`${s.chip} ${s.chipWarn}`}>paused</span> : null}
                      </td>
                      <td><span className={s.pill}>{k.prefix}</span></td>
                      <td style={{ minWidth: 160 }}>
                        <div style={{ fontSize: 12.5 }}>{usd(k.spent)} {k.cap == null ? <span className={s.dim}>· no cap</span> : <span className={s.dim}>of {usd(k.cap, 2)}</span>}</div>
                        {k.cap != null && <div className={`${s.meter} ${pct >= 90 ? s.meterHot : ""}`} role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Share of cap spent"><span style={{ width: `${pct}%` }} /></div>}
                      </td>
                      <td title={k.models.join(", ")}>{k.models.length ? `${k.models.length} model${k.models.length > 1 ? "s" : ""}` : <span className={s.dim}>All</span>}</td>
                      <td className={s.dim}>{when(k.created)}</td>
                      <td className={s.dim}>{k.lastUsed ? when(k.lastUsed) : "Never"}</td>
                      <td className={s.dim}>{k.expires ? when(k.expires) : "Never"}</td>
                      <td>
                        {!k.revoked && (confirm === k.id ? (
                          <div className={s.row} style={{ flexWrap: "nowrap" }}>
                            <span className={s.down} style={{ fontSize: 12.5 }}>Revoke {k.prefix}? It stops at once.</span>
                            <button className={`${s.btn} ${s.sm} ${s.risk}`} onClick={() => revoke(k.id)}>Revoke</button>
                            <button className={`${s.btn} ${s.sm} ${s.quiet}`} onClick={() => setConfirm(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className={s.row} style={{ flexWrap: "nowrap" }}>
                            <button className={`${s.btn} ${s.sm}`} onClick={() => open(k)}>Edit</button>
                            <button className={`${s.btn} ${s.sm} ${s.quiet} ${s.risk}`} onClick={() => setConfirm(k.id)}>Revoke</button>
                          </div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
                {keys.data && !list.length && <tr><td colSpan={8} className={s.empty}>{revokedCount ? "No live keys." : "No keys yet."} Make one for each app that calls Wisp.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <dialog ref={dlg} className={s.dialog} aria-labelledby="key-dlg-h" onClose={() => setCreated(null)}>
        <div className={s.dlgHead}>
          <h2 id="key-dlg-h">{created ? "Your new key" : editing ? `Edit ${editing.name}` : "New key"}</h2>
          <button type="button" onClick={() => dlg.current?.close()} aria-label="Close"><Icon name="close" size={16} /></button>
        </div>
        {created ? (
          <div className={s.dlgBody}>
            <p className={s.down} style={{ fontSize: 13 }}>Copy it now. Wisp keeps only a hash, so this is the only time the whole key is shown.</p>
            <pre className={s.secret}>{created}</pre>
            <div className={s.row}>
              <Copy text={created} label="Copy key" className={`${s.btn} ${s.lit}`} />
              <Copy text={`curl ${base}/models -H "Authorization: Bearer ${created}"`} label="Copy as curl" className={s.btn} />
              <button className={`${s.btn} ${s.quiet}`} style={{ marginLeft: "auto" }} onClick={() => dlg.current?.close()}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={save} className={s.dlgBody}>
            <label><span className={s.label}>Name</span>
              <input className={s.input} autoFocus maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Laptop agent" /></label>
            <label><span className={s.label}>Spend cap, USD in total</span>
              <input className={s.input} type="number" min={0} step="0.01" value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} placeholder="No cap" />
              <span className={s.hint} style={{ display: "block" }}>Leave it empty for no cap. A cap of 0 pauses the key.</span></label>
            {!editing && (
              <label><span className={s.label}>Expires</span>
                <select className={s.input} value={form.expiresDays} onChange={(e) => setForm({ ...form, expiresDays: e.target.value })}>
                  <option value="">Never</option><option value="30">In 30 days</option><option value="90">In 90 days</option><option value="365">In 1 year</option>
                </select></label>
            )}
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className={s.label}>Models</legend>
              <div className={s.row} style={{ marginBottom: 8, gap: 16 }}>
                <label className={s.check}><input type="radio" checked={form.all} onChange={() => setForm({ ...form, all: true })} />All models, including new ones</label>
                <label className={s.check}><input type="radio" checked={!form.all} onChange={() => setForm({ ...form, all: false })} />Only these</label>
              </div>
              {!form.all && (
                <div className={s.checks}>
                  {MODELS.map((m) => (
                    <label key={m.id} className={s.check}><input type="checkbox" checked={form.models.includes(m.id)} onChange={() => toggle(m.id)} />{m.name} <span className={s.dim} style={{ fontSize: 11 }}>{m.kind}</span></label>
                  ))}
                </div>
              )}
            </fieldset>
            <ErrorNote error={error} />
            <div className={s.row} style={{ justifyContent: "flex-end" }}>
              <button type="button" className={`${s.btn} ${s.quiet}`} onClick={() => dlg.current?.close()}>Cancel</button>
              <button type="submit" className={`${s.btn} ${s.lit}`} disabled={busy}>{editing ? "Save" : "Create key"}</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
