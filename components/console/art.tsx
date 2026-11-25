// Console art: line icons for the menu and dot-matrix tiles drawn as square pixels.
import type { CSSProperties } from "react";

/** Pixel art from rows of "#" (on), "+" (half) and "." (off). */
export function Pix({ art, cell = 3, gap = 1, style }: { art: string[]; cell?: number; gap?: number; style?: CSSProperties }) {
  const p = cell + gap;
  const w = Math.max(...art.map((r) => r.length)) * p - gap;
  const h = art.length * p - gap;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" style={style}>
      {art.flatMap((row, y) => [...row].map((c, x) => (c === "." || c === " " ? null : (
        <rect key={`${x}-${y}`} x={x * p} y={y * p} width={cell} height={cell} opacity={c === "+" ? 0.4 : 1} />
      ))))}
    </svg>
  );
}

// 7x7 kind glyphs (27px at cell 3).
export const KIND_ART: Record<"chat" | "image" | "video" | "music", string[]> = {
  chat: ["#######", "#.....#", "#.###.#", "#.....#", "#.##..#", "#######", "##....."],
  image: ["#######", "#....##", "#....##", "#..#..#", "#.###.#", "#######", "......."],
  video: ["#######", "#.....#", "#.#...#", "#.##..#", "#.#...#", "#.....#", "#######"],
  music: ["..#####", "..#...#", "..#...#", "..#...#", "###.###", "###.###", "+++.+++"],
};

// 9x9 room marks (35px at cell 3).
export const MARKS: Record<string, string[]> = {
  dashboard: ["####.####", "#..#.#..#", "#..#.#..#", "####.####", ".........", "####.####", "#..#.####", "#..#.####", "####.####"],
  playground: ["#########", "#.......#", "#.#.....#", "#..#....#", "#...#...#", "#..#....#", "#.#..##.#", "#.......#", "#########"],
  models: ["...###...", ".##...##.", "#...#...#", "##.....##", "#.##.##.#", "#...#...#", "#...#...#", ".##.#.##.", "...###..."],
  keys: [".###.....", "#...#....", "#.#.#....", "#...#####", ".###...#.", "......##.", ".......#.", ".........", "........."],
  usage: ["........#", "........#", ".....#..#", ".....#..#", "..#..#..#", "..#..#..#", "#.#..#..#", "#.#..#..#", "#########"],
  logs: ["#.#######", ".........", "#.#####..", ".........", "#.######.", ".........", "#.####...", ".........", "#.#######"],
  credit: ["..#####..", ".#.....#.", "#...#...#", "#..###..#", "#...#...#", "#..###..#", "#...#...#", ".#.....#.", "..#####.."],
  sealed: ["#########", "#.......#", "#..###..#", "#.#...#.#", "#.#...#.#", ".#.....#.", "..#...#..", "...#.#...", "....#...."],
};

// Bigger tiles for the sign-in side cards (cell 7: 43px for 5 columns).
export const TILES = {
  key: ["###..", "#.#..", "#####", "....#", "...##"],
  cap: [".###.", "#...#", "#####", "##.##", "#####"],
  gauge: ["#....", "##...", "###..", "####.", "#####"],
  bars: ["....#", "....#", "..#.#", "..#.#", "#.#.#", "#####"],
  rows: ["#.###", ".....", "#.##.", ".....", "#.###", ".....", "#.#.."],
  private: ["#########", "#.......#", "#.#####.#", "#.#...#.#", "#.#...#.#", "#.#####.#", "#.......#", "#.......#", "#########"],
};

// 20x20 line icons, stroke currentColor.
const P: Record<string, string> = {
  dashboard: "M3 3h6v8H3zM11 3h6v5h-6zM11 10h6v7h-6zM3 13h6v4H3z",
  playground: "M3 4h14v12H3zM6 8l2.5 2L6 12M10 12h4",
  models: "M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5zM3.5 6.25L10 10l6.5-3.75M10 10v7.5",
  keys: "M6.5 10a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM9 11l7-7M13.5 6.5l2 2M11.5 8.5l1.5 1.5",
  usage: "M3 17h14M5 14V9M8.5 14V5M12 14v-3M15.5 14V7",
  logs: "M7 5h10M7 10h10M7 15h10M3 5h1M3 10h1M3 15h1",
  credit: "M3 6.5h14v10H3zM3 6.5L14 3.5v3M13 11.5h1.5",
  sealed: "M10 2.5l6.5 2.5v5c0 4-3 6.5-6.5 7.5-3.5-1-6.5-3.5-6.5-7.5V5zM7 10l2 2 4-4",
  plus: "M10 4v12M4 10h12",
  search: "M8.5 3.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM12.2 12.2l4.3 4.3",
  fold: "M3 4h14v12H3zM8 4v12M14 8l-2 2 2 2",
  unfold: "M3 4h14v12H3zM8 4v12M12 8l2 2-2 2",
  redeem: "M3 5h14v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM8 5v10",
  signin: "M8 4H4v12h4M12 6.5L15.5 10 12 13.5M15.5 10H7",
  signout: "M8 4H4v12h4M14 6.5L17.5 10 14 13.5M17.5 10H9",
  more: "M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z",
  close: "M5 5l10 10M15 5L5 15",
  out: "M7 5h8v8M15 5L5 15",
  chev: "M5 8l5 5 5-5",
  copy: "M7 7h10v10H7zM3 13V3h10",
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 16, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  );
}

/** Dot-matrix padlock with ripples under it, for the sign-in panel. Built once at import. */
const LOCK = (() => {
  const dots: { x: number; y: number; band: number; dim?: boolean }[] = [];
  const pitch = 7;
  const band = (y: number) => Math.min(7, Math.max(0, Math.floor((y - 40) / 40)));
  for (let x = 105; x <= 315; x += pitch) for (let y = 181; y <= 318; y += pitch) {
    const hole = Math.hypot(x - 210, y - 230) < 16 || (Math.abs(x - 210) < 7 && y > 230 && y < 282);
    dots.push({ x, y, band: band(y), dim: hole });
  }
  for (let a = 0; a <= 180; a += 4) for (const r of [52, 58, 64]) {
    const t = (a * Math.PI) / 180;
    dots.push({ x: 210 + r * Math.cos(t), y: 171 - r * Math.sin(t), band: band(171 - r * Math.sin(t)) });
    if (a === 0 || a === 180) for (let y = 171; y < 181; y += pitch) dots.push({ x: 210 + r * Math.cos(t), y, band: band(y) });
  }
  for (const [rx, ry, step] of [[160, 26, 6], [118, 18, 8], [76, 11, 11]] as const)
    for (let a = 0; a < 360; a += step) {
      const t = (a * Math.PI) / 180;
      dots.push({ x: 210 + rx * Math.cos(t), y: 352 + ry * Math.sin(t), band: 7, dim: Math.sin(t) < 0 });
    }
  return dots;
})();

export function LockArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 380" fill="currentColor" aria-hidden="true">
      {Array.from({ length: 8 }, (_, b) => (
        <g key={b} style={{ animationDelay: `${b * 0.18}s` }}>
          {LOCK.filter((d) => d.band === b).map((d, i) => (
            <rect key={i} x={d.x - 1.8} y={d.y - 1.8} width={3.6} height={3.6} opacity={d.dim ? 0.18 : 0.9} />
          ))}
        </g>
      ))}
    </svg>
  );
}
