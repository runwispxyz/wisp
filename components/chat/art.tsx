"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import type { Kind } from "@/lib/models";

/* 7x7 dot-matrix icons, drawn for Wisp. "#" = lit cell. */
const ICONS = {
  chat: ["#######", "#.....#", "#.###.#", "#.....#", "#.##..#", "#######", ".#....."],
  image: ["#######", "#.....#", "#...#.#", "#.....#", "#.#...#", "##.#.##", "#######"],
  video: ["##.....", "#.#....", "#..#...", "#...#..", "#..#...", "#.#....", "##....."],
  music: ["...####", "...#..#", "...#..#", "...#..#", ".###.##", "####.##", ".##...."],
  search: [".###...", "#...#..", "#...#..", "#...#..", ".###...", "....#..", ".....##"],
  plus: ["...#...", "...#...", "...#...", "#######", "...#...", "...#...", "...#..."],
  close: ["#.....#", ".#...#.", "..#.#..", "...#...", "..#.#..", ".#...#.", "#.....#"],
  lock: [".###...", "#...#..", "#...#..", "#####..", "#####..", "##.##..", "#####.."],
  spark: ["...#...", "...#...", ".#.#.#.", "..###..", ".#.#.#.", "...#...", "...#..."],
  console: ["#######", "#.....#", "#.#...#", "#..#..#", "#.#.###", "#.....#", "#######"],
  guest: ["..###..", ".#...#.", ".#...#.", "..###..", ".......", ".#####.", "#.....#"],
  timer: ["#######", ".#...#.", "..#.#..", "...#...", "..#.#..", ".#.#.#.", "#######"],
  shield: ["#######", "#.....#", "#..#..#", "#.###.#", ".#.#.#.", "..#.#..", "...#..."],
  out: ["..#####", "....###", "...#.##", "..#...#", ".#.....", "#......", "......."],
  fold: ["#######", "#.#...#", "#.#.#.#", "#.##..#", "#.#.#.#", "#.#...#", "#######"],
  coin: [".#####.", "#.....#", "#..#..#", "#.###.#", "#..#..#", "#.....#", ".#####."],
  check: [".......", "......#", ".....#.", "#...#..", ".#.#...", "..#....", "......."],
  arrow: [".......", "...#...", "....#..", "#######", "....#..", "...#...", "......."],
  stop: [".......", ".#####.", ".#####.", ".#####.", ".#####.", ".#####.", "......."],
  menu: [".......", "#######", ".......", "#######", ".......", "#######", "......."],
  trash: ["..###..", "#######", ".#...#.", ".#.#.#.", ".#.#.#.", ".#...#.", ".#####."],
  download: ["...#...", "...#...", ".#.#.#.", "..###..", "...#...", ".......", "#######"],
} as const;
export type IconName = keyof typeof ICONS;

const pathOf = (rows: readonly string[]) =>
  rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? `M${x} ${y}h.75v.75h-.75z` : ""))).join("");
const PATHS = Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [k, pathOf(v)])) as Record<IconName, string>;

export function Icon({ name, size = 14, style, className }: { name: IconName; size?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" style={style} className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
export const KIND_ICON: Record<Kind, IconName> = { chat: "chat", image: "image", video: "video", music: "music" };

/** A 5x5 mirrored mark seeded by the maker name (no third-party logos). */
export function MakerMark({ maker, size = 21, className, style }: { maker: string; size?: number; className?: string; style?: CSSProperties }) {
  let h = 2166136261;
  for (const c of maker) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const cells: string[] = [];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++) {
      if (!((h >>> (y * 3 + x)) & 1) && !(x === 2 && y === 2)) continue;
      cells.push(`M${x + 1} ${y + 1}h.8v.8h-.8z`);
      if (x < 2) cells.push(`M${5 - x} ${y + 1}h.8v.8h-.8z`);
    }
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" fill="currentColor" shapeRendering="crispEdges" role="img" aria-label={maker} className={className} style={style}>
      <path d={cells.join("")} />
    </svg>
  );
}

/* Dot fields: 4px pitch, 3px lit cells. Each variant returns a 0..1 level for a cell at time t. */
type Field = (x: number, y: number, w: number, h: number, t: number) => number;
const noise = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const FIELDS: Record<string, Field> = {
  // a ribbon that drifts left to right
  wave: (x, y, w, h, t) => { const c = h / 2 + Math.sin(x / 9 + t * 1.4) * h * 0.28; const d = Math.abs(y - c); return d < 2.2 ? 1 - d / 3 : 0; },
  // stacked peaks with a low sun
  image: (x, y, w, h, t) => {
    const ridge = h * 0.62 - Math.abs(Math.sin(x / 6)) * h * 0.38 - Math.sin(x / 2.3) * 1.2;
    const sun = Math.hypot(x - w * 0.72, y - h * 0.3) < h * 0.16 ? 0.9 : 0;
    return y > ridge ? 0.45 + 0.4 * noise(x, y + Math.floor(t * 2)) : sun;
  },
  // frames sliding past a scan line
  video: (x, y, w, h, t) => { const f = (x + Math.floor(t * 6)) % 9; const edge = f === 0 || y === 1 || y === h - 2; const scan = Math.abs(y - ((t * 5) % h)) < 1; return edge ? 0.8 : scan ? 0.5 : 0; },
  // equalizer bars
  music: (x, y, w, h, t) => { if (x % 2) return 0; const lv = (0.35 + 0.65 * Math.abs(Math.sin(x * 0.7 + t * 2.2) * Math.cos(x * 0.31 - t))) * h; return h - y < lv ? 0.35 + 0.6 * ((h - y) / h) : 0; },
  // the Wisp flame: a tall teardrop that flickers and sheds embers
  wisp: (x, y, w, h, t) => {
    const nx = (x - w / 2) / (w * 0.2), ny = y / h;
    const sway = Math.sin(ny * 5 - t * 1.8) * 0.18 * (1 - ny);
    const half = Math.sin(Math.min(1, ny * 1.15) * Math.PI) ** 0.7 * (0.35 + 0.65 * ny);
    const d = Math.abs(nx - sway) / Math.max(half, 0.01);
    if (d < 1) return (1 - d) * (0.45 + 0.55 * ny) + 0.12 * noise(x, y + Math.floor(t * 8));
    const ember = noise(x, Math.floor(y + t * 6)) > 0.992 && ny < 0.7 ? 0.7 : 0;
    return ember;
  },
  // sparse static specks for the page background
  signal: (x, y) => (noise(x, y) > 0.975 ? 0.06 : 0),
  // a rising trail to the top right (purse)
  trail: (x, y, w, h, t) => { const c = h - (x / w) * h * 0.9; const d = Math.abs(y - c); return d < 1.5 && noise(x, Math.floor(t * 3)) > 0.35 ? (x / w) * 0.8 : 0; },
};

export function DotField({ variant, color = "var(--accent)", className, style, still, base = 0.06 }: {
  variant: keyof typeof FIELDS; color?: string; className?: string; style?: CSSProperties; still?: boolean; base?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = still || matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0, visible = true;
    const draw = (now: number) => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const col = getComputedStyle(cv).color;
      const cw = Math.floor(W / 4), ch = Math.floor(H / 4), t = now / 1000, f = FIELDS[variant];
      for (let y = 0; y < ch; y++)
        for (let x = 0; x < cw; x++) {
          const v = Math.min(1, f(x, y, cw, ch, t));
          if (v > 0.05) { ctx.globalAlpha = v; ctx.fillStyle = col; ctx.fillRect(x * 4 + 1, y * 4 + 1, 3, 3); }
          else if (base) { ctx.globalAlpha = base; ctx.fillStyle = "#fff"; ctx.fillRect(x * 4 + 2, y * 4 + 1, 1, 2); }
        }
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (visible && now - last > 80) { last = now; draw(now); }
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    const ro = new ResizeObserver(() => reduce && draw(4000));
    ro.observe(cv);
    if (reduce) draw(4000); else raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, [variant, still]);
  return <canvas ref={ref} className={className} style={{ color, ...style }} aria-hidden="true" />;
}
