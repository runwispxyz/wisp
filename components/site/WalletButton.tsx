"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { hasInjectedWallet, LIVE, short, signIn, signOut, useMe, type SignInStep } from "@/lib/client";
import { usd } from "@/lib/models";
import s from "./site.module.css";

const SAY: Record<SignInStep, string> = { connect: "Connecting…", sign: "Sign in your wallet…", done: "Signed in" };

/** Navbar wallet control: Connect → one SIWE signature; once signed in, address + balance with a small menu. */
export function WalletButton({ block }: { block?: boolean }) {
  const { me } = useMe();
  const [step, setStep] = useState<SignInStep | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false); };
    addEventListener("mousedown", close);
    addEventListener("keydown", close);
    return () => { removeEventListener("mousedown", close); removeEventListener("keydown", close); };
  }, [open]);

  async function connect() {
    setErr("");
    if (LIVE && !hasInjectedWallet()) { setErr("No wallet found in this browser."); setOpen(true); return; }
    try {
      await signIn({ onStep: setStep });
      setOpen(false);
    } catch (e) {
      setErr((e as Error).message || "Sign-in failed");
      setOpen(true);
    } finally {
      setStep(null);
    }
  }

  const cls = `btn btn-sm ${s.walletBtn} ${block ? s.walletBlock : ""}`;
  if (me === undefined) return <div className={s.wallet}><button className={cls} disabled aria-busy="true">Wallet</button></div>;

  return (
    <div className={s.wallet} ref={box}>
      {me ? (
        <button className={cls} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
          <i className={s.walletDot} aria-hidden />{short(me.address)}<span className={s.walletBal}>{usd(me.balance, 2)}</span>
        </button>
      ) : (
        <button className={cls} onClick={connect} disabled={!!step}>{step ? SAY[step] : "Connect wallet"}</button>
      )}
      {open && (
        <div className={s.walletMenu} role={me ? "menu" : "dialog"} aria-label={me ? "Wallet" : "Connect a wallet"}>
          {me ? (
            <>
              <p className={s.walletHead}><span>Signed in</span><b className="mono">{short(me.address)}</b></p>
              <p className={s.walletHead}><span>Balance</span><b className="mono">{usd(me.balance, 2)}</b></p>
              <Link role="menuitem" href="/console" className={s.walletItem} onClick={() => setOpen(false)}>Console</Link>
              <Link role="menuitem" href="/console/credit" className={s.walletItem} onClick={() => setOpen(false)}>Add credit</Link>
              <button role="menuitem" className={s.walletItem} onClick={async () => { await signOut(); setOpen(false); }}>Sign out</button>
            </>
          ) : (
            <>
              <p className={s.walletErr} role="alert">{err}</p>
              {!hasInjectedWallet() && (
                <p className={s.walletNote}>Add MetaMask or Rabby and reload, or open this page in your wallet app&apos;s browser.{" "}
                  <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">Get MetaMask ↗</a></p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
