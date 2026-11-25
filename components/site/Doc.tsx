import s from "./site.module.css";

export type Section = { id: string; title: string; body: React.ReactNode[] };

/** Long-form page: title block, optional table of contents, numbered sections. */
export function Doc({ eyebrow, title, lead, sections, toc, meta }: { eyebrow: string; title: React.ReactNode; lead: string; sections: Section[]; toc?: boolean; meta?: React.ReactNode }) {
  return (
    <>
      <section className={s.hero}>
        <div className={`${s.heroBg} dots`} aria-hidden />
        <div className={s.wrap}>
          <span className="eyebrow">{eyebrow}</span>
          <h1 className={s.h1} style={{ maxWidth: 900 }}>{title}</h1>
          <p className={s.lead}>{lead}</p>
          {meta && <div className={s.row} style={{ marginTop: 16 }}>{meta}</div>}
        </div>
      </section>
      <section className={s.wrap} style={{ paddingBottom: 72 }}>
        <div className={toc ? s.docGrid : undefined}>
          {toc && (
            <nav className={s.toc} aria-label="Contents">
              <span className="eyebrow">Contents</span>
              <ol>{sections.map((x) => <li key={x.id}><a href={`#${x.id}`}>{x.title}</a></li>)}</ol>
            </nav>
          )}
          <div className={s.prose}>
            {sections.map((x, i) => (
              <section key={x.id} id={x.id}>
                <h2>{toc && <span className="mono faint" style={{ marginRight: 10 }}>{i + 1}</span>}{x.title}</h2>
                {x.body.map((b, j) => (typeof b === "string" ? <p key={j}>{b}</p> : <div key={j}>{b}</div>))}
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
