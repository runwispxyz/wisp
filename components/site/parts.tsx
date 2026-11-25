import type { Kind } from "@/lib/models";
import { Icon } from "./icons";
import s from "./site.module.css";

export const KIND_ICON: Record<Kind, string> = { chat: "chat", image: "image", video: "video", music: "music" };
export const kindVar = (k: Kind) => ({ "--k": `var(--kind-${k})` }) as React.CSSProperties;
export const cap = (t: string) => t[0].toUpperCase() + t.slice(1);

/**
 * Stepped rule across the top of a band. Levels are 0 (top) or 1 (one step down)
 * for the left, middle and right stretch; a diagonal joins two stretches at a different level.
 */
export function Edge({ l, m, r }: { l: 0 | 1; m: 0 | 1; r: 0 | 1 }) {
  const y = (v: 0 | 1) => (v ? "var(--edge-step)" : "0px");
  const A = "var(--edge-in)", B = "calc(100% - var(--edge-in))";
  const ls = l !== m, rs = m !== r;
  const segs: React.CSSProperties[] = [];
  const diags: [string, 0 | 1, 0 | 1][] = [];
  const midL = ls ? `calc(${A} + var(--edge-step))` : "0px";
  const midR = rs ? `calc(${B} - var(--edge-step))` : "100%";
  if (ls) { segs.push({ left: 0, width: A, top: y(l) }); diags.push([A, l, m]); }
  segs.push({ left: midL, width: `calc(${midR} - ${midL})`, top: y(m) });
  if (rs) { diags.push([`calc(${B} - var(--edge-step))`, m, r]); segs.push({ left: B, width: `calc(100% - ${B})`, top: y(r) }); }
  return (
    <span className={s.edge} aria-hidden data-edge="">
      {segs.map((st, i) => <i key={i} className={s.seg} style={st} />)}
      {diags.map(([x, a, b], i) => (
        <i key={"d" + i} className={`${s.diag} ${a ? s.upd : s.dn}`} style={{ left: x, top: y(a) }} />
      ))}
      {diags.flatMap(([x, a, b], i) => [
        <b key={"n" + i} className={`${s.node} ${a ? s.lit : ""}`} style={{ left: x, top: y(a) }} />,
        <b key={"m" + i} className={`${s.node} ${b ? s.lit : ""}`} style={{ left: `calc(${x} + var(--edge-step))`, top: y(b) }} />,
      ])}
    </span>
  );
}

export function Eyebrow({ icon, label, note, center }: { icon: string; label: string; note?: string; center?: boolean }) {
  return (
    <p className={`${s.eyebrow} ${center ? s.eyeCenter : ""}`}>
      <span className={s.eyeIcon}><Icon name={icon} /></span>
      <span>{label}</span>
      {note && <span className={s.eyeNote}>{note}</span>}
    </p>
  );
}

/** Section head: eyebrow, h2 with its accent lead-in, and an optional lede beside or under it. */
export function Head({ icon, label, note, lit, title, lede, layout = "side", glow = 0 }: {
  icon: string; label: string; note?: string; lit?: string; title: React.ReactNode; lede?: React.ReactNode; layout?: "side" | "center" | "stack"; glow?: number;
}) {
  return (
    <div className={`${s.head} ${layout === "side" ? s.headSide : layout === "center" ? s.headCenter : ""}`}>
      <div className={s.titleBox}>
        <span className={s.glow} style={{ "--gx": `${[22, 40, 60, 30][glow % 4]}%` } as React.CSSProperties} aria-hidden />
        <Eyebrow icon={icon} label={label} note={note} center={layout === "center"} />
        <h2 className={s.title}>{lit && <span className={s.lit}>{lit} </span>}{title}</h2>
      </div>
      {lede && <p className={s.lede}>{lede}</p>}
    </div>
  );
}

/** Text mark for a maker: initials on a dark tile, tinted by kind. */
export function MakerMark({ name, size = 36 }: { name: string; size?: number }) {
  const ini = name.replace(/[^A-Za-z0-9 .]/g, "").split(/[\s.]+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <span className={s.mark} style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>{ini}</span>;
}
