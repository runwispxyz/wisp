import Link from "next/link";
import { Mark } from "@/components/Logo";
import { Nav } from "@/components/site/Nav";
import { DotScene } from "@/components/site/DotScene";
import { Edge } from "@/components/site/parts";
import { Icon } from "@/components/site/icons";
import { SITE } from "@/lib/site";
import s from "@/components/site/site.module.css";

const COLS: [string, [string, string][]][] = [
  ["Products", [["/chat", "Wisp Chat"], ["/console", "Wisp Console"], ["/console/playground", "Playground"], ["/console/models", "Models"]]],
  ["Developers", [["/console/keys", "API keys"], ["/console/models", "Model ids"], ["/console/usage", "Usage"], ["/console/logs", "Logs"], ["/changelog", "Changelog"], ["/status", "Status"], ["/whitepaper", "Whitepaper"], [SITE.socials.github, "GitHub"]]],
  ["Learn", [["/about", "About"], ["/thesis", "Thesis"], ["/pricing", "Pricing"], ["/blog", "Blog"], ["/token", "Token"]]],
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.frame}>
      <Nav />
      <main id="main" className={s.main}>{children}</main>
      <footer className={`${s.band} ${s.footer}`} style={{ padding: 0, paddingBottom: 8 }}>
        <div className={s.footBg} style={{ opacity: 0.5 }}><DotScene scene="noise" /></div>
        <Edge l={0} m={0} r={1} />
        <div className={s.fGridF}>
          <div className={s.fBrand}>
            <p className={s.fLogo}><Mark size={44} /><span className={s.fWord}>wisp</span></p>
            <p className={s.fLine}>Wisp is anonymized AI, paid per use. The model gets the question, never the person asking.</p>
            <div className={s.reach}>
              <a className="btn btn-sm" href={SITE.socials.github} target="_blank" rel="noreferrer"><Icon name="code" size={12} />GitHub</a>
              {!SITE.socials.x.startsWith("[") && <a className="btn btn-sm" href={SITE.socials.x} target="_blank" rel="noreferrer"><Icon name="x" size={12} />X</a>}
            </div>
          </div>
          <dl className={s.manifest}>
            <div><dt>identity</dt><dd>wisp</dd></div>
            <div><dt>category</dt><dd>Anonymized AI inference</dd></div>
            <div><dt>chain</dt><dd>{SITE.chain}</dd></div>
          </dl>
          <nav className={s.cols} aria-label="Footer">
            {COLS.map(([h, links]) => (
              <div key={h} className={s.links}>
                <span className={s.label}>{h}</span>
                {links.map(([href, l]) => <Link key={href} href={href}>{l}</Link>)}
              </div>
            ))}
          </nav>
        </div>
        <div className={s.base}>
          <p>© 2026 {SITE.name}</p>
          <p>Not financial advice. {SITE.ticker} carries no promise of value. Not affiliated with Robinhood Markets, Inc.</p>
        </div>
      </footer>
    </div>
  );
}
