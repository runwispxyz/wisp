"use client";
import { useEffect, useRef } from "react";
import s from "./site.module.css";

// Dot-matrix scenes drawn at 1 canvas px per 4 css px; a CSS dot mask turns each pixel into a lit dot.
export type Scene = "hero" | "rings" | "portal" | "wave" | "grid" | "bars" | "orb" | "arcs" | "noise" | "beam" | "key" | "scan";

type Field = (x: number, y: number, t: number, a: number) => [number, number]; // [brightness 0..1, tint 0..1]

const fr = (v: number) => v - Math.floor(v);
const hash = (x: number, y: number) => fr(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ring = (d: number, r: number, w: number) => clamp(1 - Math.abs(d - r) / w);

// Smoothed pointer offset in -1..1, used by the hero for parallax.
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

// Hero per-frame cache: everything that depends only on the column or on time.
const H = {
  w: 1, px: 0, py: 0, ox: 0, oy: 0, pulse: 1, halo: 0.1, shoot: false, hx: 0, hy: 0, shootV: 0,
  starX: new Int32Array(1), r1: new Float32Array(1), r2: new Float32Array(1), r1X: new Int32Array(1), r2X: new Int32Array(1),
  fogY: new Float32Array(1), flow: new Float32Array(1),
};
function heroPrep(t: number, w: number, a: number) {
  if (H.starX.length !== w) {
    H.starX = new Int32Array(w); H.r1 = new Float32Array(w); H.r2 = new Float32Array(w);
    H.r1X = new Int32Array(w); H.r2X = new Int32Array(w); H.fogY = new Float32Array(w); H.flow = new Float32Array(w);
  }
  H.w = w; H.px = pointer.x; H.py = pointer.y;
  H.ox = 0.66 * a; H.oy = 0.24 + 0.012 * Math.sin(t * 0.45);
  H.pulse = 0.75 + 0.25 * Math.sin(t * 1.4); H.halo = 0.1 + 0.04 * Math.sin(t * 0.8);
  const cyc = t / 7, n = Math.floor(cyc), p = cyc - n;
  H.shoot = p < 0.18;
  if (H.shoot) { const q = p / 0.18; H.hx = 0.25 + 0.6 * hash(n, 3) - q * 0.35; H.hy = 0.06 + 0.2 * hash(n, 7) + q * 0.16; H.shootV = Math.sin(q * Math.PI); }
  for (let c = 0; c < w; c++) {
    const x0 = c / w;
    H.starX[c] = Math.floor((x0 + H.px * 0.006 + t * 0.004) * 400);
    const x1 = x0 + t * 0.006 + H.px * 0.02, x2 = x0 + t * 0.014 + H.px * 0.035;
    H.r1[c] = 0.52 + 0.06 * Math.sin(x1 * 9 + 1) + 0.04 * Math.sin(x1 * 23 + 2) + 0.12 * Math.abs(x0 - 0.5);
    H.r2[c] = 0.64 + 0.05 * Math.sin(x2 * 13 + 4) + 0.03 * Math.sin(x2 * 31);
    H.r1X[c] = Math.floor(x1 * 300); H.r2X[c] = Math.floor(x2 * 280);
    H.fogY[c] = 0.6 + 0.02 * Math.sin(x0 * 5 + t * 0.3);
    H.flow[c] = 0.5 + 0.5 * Math.sin(x0 * 14 - t * 0.5) * Math.sin(x0 * 5 + t * 0.21);
  }
}

const FIELDS: Record<Scene, Field> = {
  // night sky in motion: drifting stars, shooting stars, a turning moon with a pulsing rim,
  // two parallax ridges and rolling fog. `pointer` adds a small parallax shift.
  // Per-column terms come from heroPrep, so each pixel does only cheap work.
  hero: (x0, y0, t, a) => {
    const c = Math.min(H.w - 1, Math.round(x0 * H.w));
    let b = 0, k = 0;
    // stars (column-shifted cell index keeps drift cheap)
    if (y0 < 0.62) {
      const st = hash(H.starX[c], Math.floor((y0 + H.py * 0.004) * 260));
      if (st > 0.991) b = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.2 + st * 90));
    }
    // shooting star
    if (H.shoot) {
      const dx = (x0 - H.hx) * a, dy = y0 - H.hy, along = (dx * 0.91 - dy * 0.41) / a;
      if (along > 0 && along < 0.12 && Math.abs(dx * 0.41 + dy * 0.91) < 0.004) {
        const v = (1 - along / 0.12) * H.shootV;
        if (v > b) { b = v; k = along < 0.02 ? 1 : 0; }
      }
    }
    // moon (only inside its glow box)
    const dx = (x0 + H.px * 0.014) * a - H.ox, dy = y0 + H.py * 0.01 - H.oy;
    if (dx > -0.34 && dx < 0.34 && dy > -0.34 && dy < 0.34) {
      const r = 0.13, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
      if (d < r) {
        const z = Math.sqrt(r * r - d2) / r;
        const u = Math.atan2(dx / r, z) / Math.PI + t * 0.03; // longitude, advancing = rotation
        const crater = d < r * 0.85 ? hash(Math.floor(u * 55), Math.floor((dy / r) * 22 + 30)) : 0;
        const sx = dx + r * 0.35, sy = dy + r * 0.3;
        const shade = 0.45 + 0.45 * clamp(1 - Math.sqrt(sx * sx + sy * sy) / (r * 1.6));
        b = Math.max(b, shade - 0.28 * crater * crater);
      }
      const rim = ring(d, r * 1.08, 0.007) * clamp(dx * 12 + dy * 10) * H.pulse;
      if (rim > 0 && rim > b * 0.6) { b = Math.max(b, rim); k = rim; }
      b = Math.max(b, H.halo * clamp(1 - d / (r * 2.6)));
    }
    // ridges
    const y1 = y0 + H.py * 0.012, r1 = H.r1[c];
    if (y1 > r1) b = Math.max(b, (0.26 - (y1 - r1) * 0.9) * (hash(H.r1X[c], Math.floor(y1 * 200)) > 0.45 ? 1 : 0.25) * (y1 - r1 < 0.005 ? 2.4 : 1));
    const y2 = y0 + H.py * 0.02, r2 = H.r2[c];
    if (y2 > r2) b = Math.max(b, (0.16 - (y2 - r2) * 0.5) * (hash(H.r2X[c], Math.floor(y2 * 210)) > 0.55 ? 1 : 0.2));
    // fog
    const fog = 1 - Math.abs(y0 - H.fogY[c]) / 0.05;
    if (fog > 0 && H.flow[c] > 0) b = Math.max(b, fog * H.flow[c] * 0.14 * (hash(c, Math.floor(y0 * 230)) > 0.4 ? 1 : 0));
    // satellite along the dashed line
    if (y0 > 0.298 && y0 < 0.302 && hash(Math.floor((x0 - t * 0.02) * 200), 1) > 0.5) b = Math.max(b, 0.18);
    return [b * clamp((0.98 - y0) * 4), k];
  },
  rings: (x, y, t, a) => {
    const d = Math.hypot((x - 0.5) * a, y - 0.55), an = Math.atan2(y - 0.55, (x - 0.5) * a);
    let b = 0;
    for (const [r, w, sp] of [[0.1, 0.02, 1], [0.2, 0.012, -0.6], [0.3, 0.01, 0.4], [0.42, 0.008, -0.3]] as const) {
      const v = ring(d, r, w) * (0.5 + 0.5 * Math.sign(Math.sin(an * 18 + t * sp)));
      b = Math.max(b, v * (1 - r));
    }
    const core = clamp(1 - d / 0.07);
    return [Math.max(b, core * 0.9), core > 0.3 ? 1 : 0];
  },
  portal: (x, y, t, a) => {
    const dx = (x - 0.5) * a, dy = (y - 0.48) * 1.25, d = Math.hypot(dx, dy), an = Math.atan2(dy, dx);
    const sw = 0.5 + 0.5 * Math.sin(an * 7 + d * 40 - t * 1.2);
    let b = d < 0.34 ? sw * (0.25 + 0.7 * (1 - d / 0.34)) : 0;
    b = Math.max(b, ring(d, 0.36, 0.018) * 0.9, ring(d, 0.4, 0.006) * 0.6);
    const bench = (Math.abs(y - 0.72) < 0.004 && Math.abs(dx) > 0.42) ? 0.35 : 0;
    const boxL = Math.abs(x - 0.13) < 0.08 && y > 0.5 && y < 0.82 ? 0.25 + 0.2 * hash(Math.floor(x * 200), Math.floor(y * 200)) : 0;
    const boxR = Math.abs(x - 0.87) < 0.07 && y > 0.48 && y < 0.86 ? 0.22 + 0.2 * hash(Math.floor(x * 210), Math.floor(y * 190)) : 0;
    return [Math.max(b, bench, boxL, boxR), d < 0.05 ? 1 : 0];
  },
  wave: (x, y, t) => {
    let b = 0;
    for (let i = 0; i < 9; i++) {
      const yy = 0.25 + i * 0.07 + 0.04 * Math.sin(x * 8 + i * 0.7 + t * 0.6);
      b = Math.max(b, ring(y, yy, 0.006) * (0.35 + i * 0.07));
    }
    const lit = ring(y, 0.53 + 0.04 * Math.sin(x * 8 + 2.8 + t * 0.6), 0.008) * clamp(1 - Math.abs(x - 0.5 - 0.3 * Math.sin(t * 0.3)) * 4);
    return [Math.max(b, lit), lit];
  },
  grid: (x, y, t) => {
    if (y < 0.35) return [hash(Math.floor(x * 300), Math.floor(y * 300)) > 0.985 ? 0.4 : 0, 0];
    const z = (y - 0.35) / 0.65, px = (x - 0.5) / (z + 0.05);
    const gx = Math.abs(fr(px * 2) - 0.5) < 0.04 ? 1 : 0, gy = Math.abs(fr(1 / (z + 0.05) * 0.6 + t * 0.4) - 0.5) < 0.05 ? 1 : 0;
    const v = Math.max(gx, gy) * (0.15 + 0.7 * z);
    return [v, Math.abs(px) < 0.25 && gy ? 1 : 0];
  },
  bars: (x, y, t) => {
    const i = Math.floor(x * 40), h = 0.15 + 0.55 * Math.abs(Math.sin(i * 0.7 + t * 1.6) * Math.sin(i * 0.23 + t * 0.7));
    const on = fr(x * 40) < 0.7 && 0.85 - y < h && y < 0.85;
    return [on ? 0.35 + 0.6 * (1 - (0.85 - y) / h) : 0, on && 0.85 - y > h - 0.03 ? 1 : 0];
  },
  orb: (x, y, t, a) => {
    const d = Math.hypot((x - 0.6) * a, y - 0.4);
    const sun = d < 0.18 && Math.abs(fr(y * 30) - 0.5) < 0.35 ? 0.85 - d * 2 : 0;
    const hill = y > 0.62 + 0.08 * Math.sin(x * 7 + t * 0.2) ? 0.5 - (y - 0.62) : 0;
    return [Math.max(sun, hill, hash(Math.floor(x * 300), Math.floor(y * 300)) > 0.99 ? 0.3 : 0), sun > 0 ? 1 : 0];
  },
  arcs: (x, y, t, a) => {
    const dl = Math.hypot((x + 0.1) * a, (y - 0.5) * 1.2), dr = Math.hypot((x - 1.1) * a, (y - 0.5) * 1.2);
    const R = 0.35 * a;
    const v = Math.max(ring(dl, R, 0.06 * a), ring(dr, R, 0.06 * a)) * (0.4 + 0.6 * hash(Math.floor(x * 260), Math.floor(y * 200 + t)));
    const sp = hash(Math.floor(x * 200), Math.floor(y * 160)) > 0.993 ? 0.6 : 0;
    const glow = clamp(1 - Math.hypot((x - 0.73) * a, y - 0.75) / 0.08);
    return [Math.max(v * 0.85, sp, glow), glow > 0.2 ? 1 : 0];
  },
  noise: (x, y, t) => {
    const v = 0.5 + 0.5 * Math.sin(x * 11 + Math.sin(y * 7 + t * 0.3) * 2) * Math.sin(y * 9 - t * 0.2);
    return [v * v * 0.35 * hash(Math.floor(x * 500), Math.floor(y * 500)), 0];
  },
  beam: (x, y, t, a) => {
    const cx = 0.42 + 0.02 * Math.sin(y * 10);
    const tower = Math.abs(x - 0.62) < 0.08 && y > 0.12 && y < 0.92 && (Math.abs(fr(y * 12) - 0.5) < 0.08 || Math.abs(Math.abs(x - 0.62) - 0.075) < 0.006) ? 0.55 : 0;
    const body = Math.abs(x - cx) < 0.06 * (y < 0.2 ? (y - 0.05) / 0.15 : 1) && y > 0.05 && y < 0.88 ? 0.5 + 0.4 * Math.cos((x - cx) * 30) : 0;
    const lamp = Math.abs(x - 0.64) < 0.04 && Math.abs(y - 0.26) < 0.01 && fr(x * 60) < 0.6 ? 1 : 0;
    const smoke = y > 0.82 ? clamp(0.5 - Math.abs(x - 0.45) * a * 0.8 + 0.2 * Math.sin(x * 30 + t)) * 0.6 : 0;
    return [Math.max(tower, body, smoke, lamp), lamp];
  },
  key: (x, y, t) => {
    const board = y > 0.18 && y < 0.36 && x > 0.08 && x < 0.92 ? (y < 0.2 || y > 0.34 || x < 0.1 || x > 0.9 ? 0.7 : 0.08) : 0;
    const txt = y > 0.24 && y < 0.3 && x > 0.18 && x < 0.82 && hash(Math.floor(x * 120), Math.floor(y * 90)) > 0.45 ? 0.75 : 0;
    const col = Math.floor((x - 0.1) * 10);
    const tiles = y > 0.42 && y < 0.56 && x > 0.1 && x < 0.9 && fr((x - 0.1) * 10) < 0.82 ? 0.28 + 0.1 * Math.sin(col) : 0;
    const on = col === Math.floor(fr(t * 0.08) * 8) && tiles ? 1 : 0;
    const stem = Math.abs(x - 0.5) < 0.012 && y < 0.18 ? 0.5 : 0;
    return [Math.max(board, txt, tiles, stem, on), on || (txt && x < 0.3) ? 1 : 0];
  },
  scan: (x, y, t) => {
    const card = x > 0.12 && x < 0.86 && y > 0.22 && y < 0.62 ? (Math.abs(fr(x * 24) - 0.5) < 0.2 && Math.abs(y - 0.42) < 0.03 ? 0.6 : 0.16) : 0;
    const edge = (Math.abs(x - 0.12) < 0.004 || Math.abs(x - 0.86) < 0.004) && y > 0.22 && y < 0.62 ? 0.6 : 0;
    const sx = 0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.7));
    const line = Math.abs(x - sx) < 0.004 && y > 0.12 && y < 0.72 ? 1 : 0;
    return [Math.max(card, edge, line), line];
  },
};

function hex(c: string): [number, number, number] {
  const m = c.trim().replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((v) => v + v).join("") : m.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Fills its positioned parent. `tint` is a CSS color or var name used for the lit parts. */
export function DotScene({ scene, tint = "--accent", solid, className }: { scene: Scene; tint?: string; solid?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const f = FIELDS[scene];
    const css = getComputedStyle(cv);
    const tc = hex(tint.startsWith("--") ? css.getPropertyValue(tint) || "#eac48f" : tint);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, img: ImageData | null = null, raf = 0, seen = false, last = 0;
    const size = () => {
      const r = cv.parentElement!.getBoundingClientRect();
      w = Math.max(1, Math.ceil(r.width / 4)); h = Math.max(1, Math.ceil(r.height / 4));
      cv.width = w; cv.height = h; cv.style.width = w * 4 + "px"; cv.style.height = h * 4 + "px";
      img = ctx.createImageData(w, h);
    };
    const draw = (t: number) => {
      if (!img) return;
      const d = img.data, a = w / h;
      if (scene === "hero") heroPrep(t, w, a);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const [b, k0] = f(i / w, j / h, t, a);
        const k = solid ? 1 : k0;
        const p = (j * w + i) * 4, v = clamp(b);
        d[p] = 215 + (tc[0] - 215) * k; d[p + 1] = 231 + (tc[1] - 231) * k; d[p + 2] = 230 + (tc[2] - 230) * k; d[p + 3] = v * 255; // base dots: mint white
      }
      ctx.putImageData(img, 0, 0);
    };
    const frame = scene === "hero" ? 33 : 66; // hero ~30 fps, background scenes ~15 fps
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < frame) return;
      last = now;
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      draw(now / 1000);
    };
    const move = (e: PointerEvent) => { pointer.tx = e.clientX / innerWidth * 2 - 1; pointer.ty = e.clientY / innerHeight * 2 - 1; };
    if (scene === "hero" && !still) addEventListener("pointermove", move, { passive: true });
    const start = () => { if (!raf && seen && !still && !document.hidden) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    size(); draw(0);
    const ro = new ResizeObserver(() => { size(); draw(last / 1000); });
    ro.observe(cv.parentElement!);
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) start(); else stop(); });
    io.observe(cv);
    const vis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", vis);
    return () => { stop(); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", vis); removeEventListener("pointermove", move); };
  }, [scene, tint, solid]);
  return <canvas ref={ref} className={`${s.scene} ${className || ""}`} aria-hidden />;
}
