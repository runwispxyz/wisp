"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/client";

const box: React.CSSProperties = { width: "100%", maxWidth: 520, padding: "clamp(20px, 4vw, 32px)", border: "1px solid var(--edge-2)", background: "var(--bg-1)" };
const ADDR = /^0x[0-9a-fA-F]{40}$/;

export function AdminPanel({ signedIn, contract }: { signedIn: boolean; contract: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [ca, setCa] = useState(contract);
  const [saved, setSaved] = useState(contract);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const login = () => run(async () => { await api("/api/admin/login", { method: "POST", json: { password: pw } }); setPw(""); router.refresh(); });
  const logout = () => run(async () => { await api("/api/admin/logout", { method: "POST" }); router.refresh(); });
  const save = (value: string) => run(async () => {
    const r = await api<{ contract: string }>("/api/admin/contract", { method: "PUT", json: { contract: value } });
    setCa(r.contract); setSaved(r.contract);
    setMsg({ ok: true, text: r.contract ? "Saved. The hero and token sections now show this address." : "Cleared. The site shows \"at launch\" again." });
  });

  const trimmed = ca.trim();
  const valid = !trimmed || ADDR.test(trimmed);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px 16px" }}>
      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Logo suffix=" admin" />
          {signedIn && <button className="btn btn-sm" onClick={logout} disabled={busy}>Sign out</button>}
        </div>

        {!signedIn ? (
          <form onSubmit={(e) => { e.preventDefault(); login(); }}>
            <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em" }}>Admin sign-in</h1>
            <p className="muted" style={{ margin: "0 0 20px", fontSize: 14 }}>Only the site owner can change the contract address.</p>
            <label className="label" htmlFor="pw">Password</label>
            <input id="pw" className="field" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} disabled={busy || !pw}>{busy ? "Checking…" : "Sign in"}</button>
          </form>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (valid) save(trimmed); }}>
            <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em" }}>Contract address</h1>
            <p className="muted" style={{ margin: "0 0 20px", fontSize: 14 }}>Shown in the hero and the token sections. Leave it empty to show &ldquo;at launch&rdquo;.</p>
            <label className="label" htmlFor="ca">$WISP CA on Robinhood Chain</label>
            <input id="ca" className="field mono" placeholder="0x…" spellCheck={false} autoComplete="off" value={ca} onChange={(e) => setCa(e.target.value)}
              aria-invalid={!valid} style={!valid ? { borderColor: "var(--down)" } : undefined} />
            {!valid && <p className="down" style={{ margin: "8px 0 0", fontSize: 13 }}>Needs 0x followed by 40 hex characters.</p>}
            <p className="faint mono" style={{ margin: "10px 0 0", fontSize: 12 }}>Live now: {saved || "at launch (no address)"}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button className="btn btn-primary" disabled={busy || !valid || trimmed === saved}>{busy ? "Saving…" : "Save"}</button>
              {saved && <button type="button" className="btn" disabled={busy} onClick={() => { if (confirm("Clear the contract address? The site will show \"at launch\".")) save(""); }}>Clear</button>}
              <Link href="/" className="btn btn-ghost" target="_blank" rel="noopener noreferrer">View site ↗</Link>
            </div>
          </form>
        )}

        {msg && <p role="status" className={msg.ok ? "up" : "down"} style={{ margin: "16px 0 0", fontSize: 14 }}>{msg.text}</p>}
      </div>
    </main>
  );
}
