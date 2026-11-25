import { CHANGELOG } from "@/components/site/content";
import s from "@/components/site/site.module.css";

export const metadata = { title: "Changelog", description: "Every change to Wisp you would notice, newest first." };

export default function Changelog() {
  return (
    <section className={s.hero}>
      <div className={s.wrap}>
        <span className="eyebrow">Changelog</span>
        <h1 className={s.h1}>What changed</h1>
        <p className={s.lead}>Every change you would notice, newest first.</p>
        <ol className={s.road} style={{ marginTop: 40 }}>
          {CHANGELOG.map((c) => (
            <li key={c.date} style={{ display: "grid", gridTemplateColumns: "minmax(96px, 160px) 1fr", gap: 16 }}>
              <time className="mono faint" dateTime={c.date}>{c.date}</time>
              <div>
                <b>{c.title}</b>
                <ul className="muted" style={{ margin: "8px 0 0", paddingLeft: 18 }}>{c.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
