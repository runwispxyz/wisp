import Link from "next/link";
import { BuysTable } from "@/components/site/widgets";
import { MODELS, discount } from "@/lib/models";
import s from "@/components/site/site.module.css";

export const metadata = { title: "Pricing", description: "Every Wisp model, with what a dollar buys on Wisp." };

export default function Pricing() {
  const best = Math.max(...MODELS.map((m) => discount(m) ?? 0));
  return (
    <>
      <section className={s.hero}>
        <div className={`${s.heroBg} dots`} aria-hidden />
        <div className={s.wrap}>
          <span className="eyebrow">Pricing</span>
          <h1 className={s.h1}>What <em>$N</em> buys</h1>
          <p className={s.lead}>Pay only for what each call uses{best > 0 ? <>, up to {best}% below the maker&apos;s list price</> : null}. No subscription, no card, no minimum top-up.</p>
        </div>
      </section>
      <section className={s.wrap} style={{ paddingBottom: 72 }}>
        <BuysTable />
      </section>
      <section className={s.sec}>
        <div className={`${s.wrap} ${s.grid3}`}>
          <div className={`card ${s.tile}`}><h3 style={{ marginTop: 0 }}>Held, then settled</h3><p>Each call holds its worst case first, then charges only what it used.</p></div>
          <div className={`card ${s.tile}`}><h3 style={{ marginTop: 0 }}>Failed calls are free</h3><p>A call that fails before any output releases its hold in full. A cut-off reply is charged for what arrived.</p></div>
          <div className={`card ${s.tile}`}><h3 style={{ marginTop: 0 }}>Pay in USDG</h3><p>Top up on Robinhood Chain from your own deposit address in <Link href="/console" className="accent">Wisp Console</Link>.</p></div>
        </div>
      </section>
    </>
  );
}
