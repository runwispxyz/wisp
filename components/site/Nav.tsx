"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Mark } from "@/components/Logo";
import { DotScene, type Scene } from "./DotScene";
import { Icon } from "./icons";
import { WalletButton } from "./WalletButton";
import s from "./site.module.css";

type Entry = { href: string; icon: string; t: string; d: string; live?: boolean; note?: string; soon?: boolean };
type Group = { label: string; items: Entry[]; feature: { href: string; t: string; d: string; scene: Scene } };

const GROUPS: Group[] = [
  {
    label: "Products",
    items: [
      { href: "/chat", icon: "chat", t: "Wisp Chat", d: "Chat and image models in one private window", live: true },
      { href: "/console", icon: "grid", t: "Wisp Console", d: "Keys, usage, credit and the Playground", live: true },
      { href: "/console/playground", icon: "code", t: "Playground", d: "Try any model with your own settings", live: true },
      { href: "/console/sealed", icon: "lock", t: "Sealed models", d: "Open-weight models on attested hardware", soon: true },
    ],
    feature: { href: "/thesis#privacy", t: "How privacy works", d: "Your wallet, IP and device stop at the Wisp gateway.", scene: "rings" },
  },
  {
    label: "Developers",
    items: [
      { href: "/console/keys", icon: "key", t: "API keys", d: "One Wisp key for every model in the catalog", note: "wisp_" },
      { href: "/console/models", icon: "grid", t: "Models", d: "Ids, context windows and live prices", note: "catalog" },
      { href: "/changelog", icon: "doc", t: "Changelog", d: "What changed, newest first" },
      { href: "/status", icon: "spark", t: "Status", d: "Whether every service answers right now" },
    ],
    feature: { href: "/blog/change-one-line", t: "Change one line", d: "Point base_url at the gateway and keep your SDK code.", scene: "key" },
  },
  {
    label: "Learn",
    items: [
      { href: "/about", icon: "door", t: "About", d: "What Wisp is and how we work", note: "company" },
      { href: "/thesis", icon: "spark", t: "Thesis", d: "Why private, pay-per-use AI is worth building", note: "why" },
      { href: "/pricing", icon: "coin", t: "Pricing", d: "What every model costs per use", note: "prices" },
      { href: "/whitepaper", icon: "doc", t: "Whitepaper", d: "The design, section by section", note: "v1" },
      { href: "/blog", icon: "doc", t: "Blog", d: "Notes from the people building Wisp", note: "articles" },
    ],
    feature: { href: "/thesis", t: "Less cost, less known about you", d: "The case for one private balance across every model.", scene: "orb" },
  },
];

function ItemRow({ e }: { e: Entry }) {
  const body = (
    <>
      <span className={s.tile44}><Icon name={e.icon} size={18} /></span>
      <span className={s.itemText}><b>{e.t}</b><span>{e.d}</span></span>
      {e.live ? <em className={`${s.badge} ${s.badgeLive}`}>Live</em> : e.soon ? <em className={s.badge}>Coming soon</em> : <em className={s.note}>{e.note}</em>}
    </>
  );
  return e.soon ? <span className={s.mItem}>{body}</span> : <Link href={e.href} className={s.mItem}>{body}</Link>;
}

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [solid, setSolid] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { setOpen(null); setSheet(false); }, [path]);
  useEffect(() => {
    const f = () => setSolid(scrollY > 8);
    f(); addEventListener("scroll", f, { passive: true });
    const k = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(null), setSheet(false));
    const c = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(null);
    addEventListener("keydown", k); addEventListener("click", c);
    return () => { removeEventListener("scroll", f); removeEventListener("keydown", k); removeEventListener("click", c); };
  }, []);
  const cur = (h: string) => (path === h || path.startsWith(h + "/") ? "page" : undefined);
  return (
    <header ref={ref} className={`${s.header} ${solid || open ? s.solid : ""}`}>
      <div className={s.bar}>
        <Link href="/" className={s.brand} aria-label="Wisp home"><Mark size={30} />wisp</Link>
        <nav className={s.nav} aria-label="Main">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <button className={`${s.item} ${open === g.label ? s.itemOn : ""}`} aria-expanded={open === g.label} aria-controls={`p-${g.label}`}
                onClick={() => setOpen(open === g.label ? null : g.label)}>
                {g.label}<span className={s.caret} />
              </button>
              {open === g.label && (
                <div id={`p-${g.label}`} className={s.panel}>
                  <div className={s.panelInner}>
                    <div className={s.items}>{g.items.map((e) => <ItemRow key={e.t} e={e} />)}</div>
                    <Link href={g.feature.href} className={s.feature}>
                      <span className={s.fill}><DotScene scene={g.feature.scene} /></span>
                      <span className={s.featureText}><b>{g.feature.t}</b><span>{g.feature.d}</span></span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
          <Link href="/console/models" className={s.item}>Models <span className={s.btnIc}><Icon name="out" size={12} /></span></Link>
          <Link href="/token" className={s.item} aria-current={cur("/token")}>Token</Link>
        </nav>
        <div className={s.right}>
          <Link href="/console" className={`btn btn-sm ${s.ghost}`}>Console <span className={s.btnIc}><Icon name="out" size={12} /></span></Link>
          <WalletButton />
          <Link href="/chat" className={`btn btn-primary btn-sm ${s.navLit}`}>Open Wisp Chat</Link>
          <button className={s.menu} aria-expanded={sheet} aria-controls="sheet" aria-label={sheet ? "Close menu" : "Open menu"} onClick={() => setSheet(!sheet)}>
            <Icon name={sheet ? "close" : "burger"} />
          </button>
        </div>
      </div>
      {sheet && (
        <div id="sheet" className={s.sheet}>
          {GROUPS.map((g) => (
            <section key={g.label} className={s.sheetGroup}>
              <p className={s.panelLabel}>{g.label}</p>
              {g.items.map((e) => <ItemRow key={e.t} e={e} />)}
            </section>
          ))}
          <section className={s.sheetGroup}>
            <Link href="/console/models" className={s.sheetLink}>Models <Icon name="out" /></Link>
            <Link href="/token" className={s.sheetLink}>Token <Icon name="arrow" /></Link>
            <WalletButton block />
            <Link href="/chat" className={`btn btn-primary ${s.sheetBtn}`}>Open Wisp Chat</Link>
          </section>
        </div>
      )}
    </header>
  );
}
