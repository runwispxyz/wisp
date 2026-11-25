import Link from "next/link";
import { notFound } from "next/navigation";
import { POSTS } from "@/components/site/content";
import s from "@/components/site/site.module.css";

export const dynamicParams = false;
export const generateStaticParams = () => POSTS.map((p) => ({ slug: p.slug }));

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P) {
  const { slug } = await params;
  const p = POSTS.find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.summary } : {};
}

export default async function Post({ params }: P) {
  const { slug } = await params;
  const i = POSTS.findIndex((x) => x.slug === slug);
  if (i < 0) notFound();
  const p = POSTS[i], next = POSTS[(i + 1) % POSTS.length];
  return (
    <article className={s.hero}>
      <div className={`${s.wrap} ${s.prose}`}>
        <Link href="/blog" className="faint">← Blog</Link>
        <p className="mono faint" style={{ fontSize: 12 }}><time dateTime={p.date}>{p.date}</time></p>
        <h1 className={s.h2}>{p.title}</h1>
        <p style={{ fontSize: 18, color: "var(--text)" }}>{p.summary}</p>
        {p.body.map((b) => <p key={b}>{b}</p>)}
        <div className="card" style={{ padding: 16, marginTop: 40 }}>
          <span className="faint" style={{ fontSize: 12 }}>Next</span><br />
          <Link href={`/blog/${next.slug}`} className="accent">{next.title} →</Link>
        </div>
      </div>
    </article>
  );
}
