"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Logo } from "@/components/Logo";
import { Icon, type IconName } from "@/components/console/art";
import { MeCtx, fireAction, s } from "@/components/console/ui";
import { short, signOut, useMe } from "@/lib/client";
import { MODELS, getModel, usd } from "@/lib/models";

// [label, href, icon, colour]
const NAV: [string, string, IconName, string][] = [
  ["Dashboard", "/console", "dashboard", "var(--accent)"], ["Playground", "/console/playground", "playground", "var(--kind-chat)"],
  ["Models", "/console/models", "models", "var(--kind-image)"], ["Keys", "/console/keys", "keys", "var(--kind-music)"],
  ["Usage", "/console/usage", "usage", "var(--kind-video)"], ["Logs", "/console/logs", "logs", "var(--info)"],
  ["Credit", "/console/credit", "credit", "var(--warn)"], ["Sealed", "/console/sealed", "sealed", "var(--sealed)"],
];
// [label, href, shortcut key, action fired when already on the page, icon, colour]
const QUICK = [
  ["Add credit", "/console/credit#add", "a", "add", "credit", "var(--warn)"], ["Redeem a code", "/console/credit#redeem", "r", "redeem", "redeem", "var(--warn)"],
  ["Open playground", "/console/playground", "p", "", "playground", "var(--kind-chat)"],
] as const;
const NEW_KEY = ["New key", "/console/keys#new", "n", "new"] as const;
const TABS = [NAV[0], NAV[2], NAV[1], NAV[3]];

// Room colour per section: [colour, card tint, card edge, top light]
const ROOMS: Record<string, [string, number, number, number]> = {
  "": ["var(--accent)", 4, 24, 11], playground: ["var(--kind-chat)", 10, 34, 19], models: ["var(--kind-image)", 9, 32, 16],
  keys: ["var(--kind-music)", 9, 32, 17], usage: ["var(--kind-video)", 7, 28, 13], logs: ["var(--info)", 9, 32, 16],
  credit: ["var(--warn)", 7, 28, 13], sealed: ["var(--sealed)", 10, 34, 19],
};
const KIND_ROOM = { chat: ROOMS.playground, image: ROOMS.models, video: ROOMS.usage, music: ROOMS.keys };
const GATED = new Set(["", "keys", "usage", "logs", "credit"]);

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { me, reload } = useMe();
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState("");
  const [folded, setFolded] = useState(false);
  const [more, setMore] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const sheetSearch = useRef<HTMLInputElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);

  const [narrow, setNarrow] = useState(false);
  useEffect(() => { try { setFolded(localStorage.getItem("wisp-rail") === "folded"); } catch {} }, []);
  // Tablets get the folded rail without the option to open it.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px) and (max-width: 1023.98px)");
    const on = () => setNarrow(mq.matches);
    on(); mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const fold = (v: boolean) => { setFolded(v); try { localStorage.setItem("wisp-rail", v ? "folded" : "open"); } catch {} };

  const openSheet = (focus = false) => { if (!sheet.current?.open) sheet.current?.showModal(); setMore(true); if (focus) setTimeout(() => sheetSearch.current?.focus()); };
  const closeSheet = () => sheet.current?.close();
  useEffect(() => { setQ(""); closeSheet(); }, [path]);

  // Wide screens type in the rail; folded or narrow ones use the sheet.
  const findFocus = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) { fold(false); setTimeout(() => search.current?.focus()); }
    else openSheet(true);
  };
  const go = (href: string, action: string) => { router.push(href); if (action) fireAction(action); closeSheet(); };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); findFocus(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target;
      if ((t instanceof Element && t.closest("input, textarea, select, [contenteditable='true']")) || document.querySelector("dialog[open]")) return;
      const hit = [...QUICK, NEW_KEY].find((x) => x[2] === e.key.toLowerCase());
      if (hit) { e.preventDefault(); go(hit[1], hit[3]); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const nav = NAV.filter(([l]) => l.toLowerCase().includes(t)).map(([l, h]) => ({ label: l, href: h, note: "Page" }));
    const models = MODELS.filter((m) => `${m.name} ${m.id} ${m.maker} ${m.kind}`.toLowerCase().includes(t))
      .map((m) => ({ label: m.name, href: `/console/models/${m.id}`, note: m.kind }));
    return [...nav, ...models, { label: `Ask “${q.trim()}” in the playground`, href: `/console/playground?q=${encodeURIComponent(q.trim())}`, note: "↵" }].slice(0, 12);
  }, [q]);

  const isActive = (h: string) => (h === "/console" ? path === h : path === h || path.startsWith(h + "/"));
  const seg = path.split("/")[2] ?? "";
  const kind = seg === "models" && path.split("/")[3] ? getModel(decodeURIComponent(path.split("/")[3]))?.kind : undefined;
  const [room, tint, edge, light] = kind ? KIND_ROOM[kind] : ROOMS[seg] ?? ROOMS[""];
  const signingIn = me === null && GATED.has(seg);
  const roomVars = { "--room": room, "--tint": `${tint}%`, "--edge": `${edge}%`, "--light": `${light}%` } as CSSProperties;

  const searchBox = (ref: React.RefObject<HTMLInputElement | null>, id: string) => (
    <div className={s.msearch} role="search">
      <label className={s.msearchBox}>
        <Icon name="search" size={18} />
        <span className="sr">Search pages and models, or ask</span>
        <input id={id} ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or ask" autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) { router.push(results[0].href); setQ(""); ref.current?.blur(); closeSheet(); }
            if (e.key === "Escape" && q) { e.preventDefault(); setQ(""); }
          }} />
        <span className={s.kbd}>⌘K</span>
      </label>
      {results.length > 0 && (
        <div className={s.results}>
          {results.map((r, i) => (
            <Link key={r.href} href={r.href} className={i === 0 ? s.first : ""} onClick={() => { setQ(""); closeSheet(); }}>
              <span>{r.label}</span><span>{r.note}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <MeCtx.Provider value={{ me, reload }}>
      <div className={`${s.app} ${folded || narrow ? s.folded : ""}`} style={roomVars}>
        <header className={s.top}>
          <Link href="/console" className={s.topBrand} aria-label="Wisp console, dashboard"><Logo suffix=" console" /></Link>
          <button className={s.topSearch} aria-label="Search or ask" onClick={() => openSheet(true)}><Icon name="search" size={18} /></button>
        </header>

        <nav className={s.rail} aria-label="Console">
          <div className={s.railHead}>
            <div className={s.rheadRow}>
              <Link href="/console" className={s.rbrand} aria-label="Wisp console, dashboard"><Logo suffix=" console" /></Link>
              {!narrow && <button className={s.fold} onClick={() => fold(!folded)} aria-label={folded ? "Open the menu" : "Fold the menu"} aria-pressed={folded}>
                <Icon name={folded ? "unfold" : "fold"} size={18} />
              </button>}
            </div>
            {searchBox(search, "rail-search")}
            <button className={s.searchIco} onClick={findFocus} aria-label="Search or ask"><Icon name="search" size={18} /><span className={s.tip}>Search</span></button>
            <button className={s.newKey} onClick={() => go(NEW_KEY[1], NEW_KEY[3])} aria-label="New key, key N">
              <Icon name="plus" size={14} /><span className={s.miL}>New key</span><span className={s.kbd}>N</span><span className={s.tip}>New key</span>
            </button>
          </div>

          <p className={s.ml}>Menu</p>
          <div className={s.group}>
            {NAV.map(([label, href, icon, pc]) => (
              <Link key={href} href={href} className={s.mi} style={{ "--pc": pc } as CSSProperties} aria-current={isActive(href) ? "page" : undefined}>
                <Icon name={icon} /><span className={s.miL}>{label}</span>
                {label === "Models" && <span className={s.miN}>{MODELS.length}</span>}
                <span className={s.tip}>{label}</span>
              </Link>
            ))}
          </div>

          <p className={s.ml}>Quick actions</p>
          <div className={s.group}>
            {QUICK.map(([label, href, k, action, icon, pc]) => (
              <Link key={label} href={href} className={s.qa} style={{ "--pc": pc } as CSSProperties} onClick={() => action && fireAction(action)} aria-label={`${label}, key ${k.toUpperCase()}`}>
                <span className={s.qaIc}><Icon name={icon} size={14} /></span><span className={s.miL}>{label}</span>
                <span className={s.kbd}>{k.toUpperCase()}</span><span className={s.tip}>{label}</span>
              </Link>
            ))}
          </div>

          <div className={s.wallet}>
            {me ? (
              <>
                <div className={s.acct} title={me.address}><span className={s.led} /><span>{short(me.address)}</span><b>{usd(me.balance, 2)}</b></div>
                <div className={s.walletRow}>
                  <Link href="/console/credit#add" className={`${s.vbtn} ${s.vbtnLit}`} onClick={() => fireAction("add")} aria-label="Add credit"><Icon name="plus" size={14} /><span>Add credit</span></Link>
                  <button className={s.vbtn} onClick={() => signOut()} aria-label="Sign out"><Icon name="signout" size={14} /><span>Sign out</span></button>
                </div>
              </>
            ) : me === null ? (
              <>
                <p className={s.guest}><b>Not signed in</b><span>Sign in with your wallet to see your balance, keys and usage.</span></p>
                <Link href="/console" className={`${s.vbtn} ${s.vbtnLit} ${s.wide}`} aria-label="Sign in with your wallet"><Icon name="signin" size={14} /><span>Sign in</span></Link>
              </>
            ) : <p className={s.guest}><span>Loading…</span></p>}
          </div>
        </nav>

        <main id="main" className={`${s.centre} ${signingIn ? s.centreSi : ""}`}>
          <div className={`${s.rm} ${signingIn ? s.rmSi : ""}`} style={signingIn ? ({ "--room": "var(--accent)" } as CSSProperties) : undefined}>
            <div className={s.wrap} key={path} style={signingIn ? { width: "100%", display: "flex", flexDirection: "column", flex: "1 1 auto" } : undefined}>{children}</div>
          </div>
        </main>

        <nav className={s.tabbar} aria-label="Console">
          {TABS.map(([label, href, icon]) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}><Icon name={icon} size={18} />{label}</Link>
          ))}
          <button aria-expanded={more} aria-controls="console-more" onClick={() => openSheet()}><Icon name="more" size={18} />More</button>
        </nav>

        <dialog id="console-more" ref={sheet} className={s.sheet} aria-label="More" onClose={() => { setMore(false); setQ(""); }}
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); if (e.target === e.currentTarget && (e.clientY < r.top || e.clientY > r.bottom)) closeSheet(); }}>
          <div className={s.sheetHead}>More<button className={s.sheetX} onClick={closeSheet} aria-label="Close"><Icon name="close" size={18} /></button></div>
          {searchBox(sheetSearch, "sheet-search")}
          <p className={s.sheetLabel}>Places</p>
          <div className={s.sheetGrid}>
            {NAV.filter((n) => !TABS.includes(n)).map(([label, href, icon, pc]) => (
              <Link key={href} href={href} style={{ "--pc": pc } as CSSProperties} aria-current={isActive(href) ? "page" : undefined}><Icon name={icon} size={18} />{label}</Link>
            ))}
          </div>
          <p className={s.sheetLabel}>Quick actions</p>
          <div className={s.sheetGrid}>
            <button onClick={() => go(NEW_KEY[1], NEW_KEY[3])}><Icon name="plus" size={18} />New key</button>
            {QUICK.slice(0, 2).map(([label, href, , action, icon, pc]) => (
              <button key={label} style={{ "--pc": pc } as CSSProperties} onClick={() => go(href, action)}><Icon name={icon} size={18} />{label}</button>
            ))}
            {me && <button onClick={() => signOut()}><Icon name="signout" size={18} />Sign out</button>}
          </div>
        </dialog>
      </div>
    </MeCtx.Provider>
  );
}
