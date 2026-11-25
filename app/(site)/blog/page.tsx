import Link from "next/link";
import { POSTS } from "@/components/site/content";
import s from "@/components/site/site.module.css";

export const metadata = { title: "Blog", description: "How Wisp works, written by the people building it." };

export default function Blog() {
  return (
    <section className={s.hero}>
      <div className={s.wrap}>
        <span className="eyebrow">Blog</span>
        <h1 className={s.h1}>Notes from the gateway</h1>
        <p className={s.lead}>How Wisp works, written by the people building it.</p>
        <div className={s.grid2} style={{ marginTop: 40 }}>
          {POSTS.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className={`card ${s.tile}`}>
              <time className="mono faint" style={{ fontSize: 12 }} dateTime={p.date}>{p.date}</time>
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
