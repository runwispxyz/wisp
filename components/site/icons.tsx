// Small square-cornered icons for the public site, drawn for Wisp.
const P: Record<string, string> = {
  chat: "M2 3h12v8H7l-3 3v-3H2z M5 6h6 M5 8h4",
  image: "M2 3h12v10H2z M2 11l4-4 3 3 2-2 3 3 M10 6h1",
  video: "M2 3h12v10H2z M6 6v4l4-2z",
  music: "M6 12V4l7-1v8 M6 12a2 2 0 1 1-2-2h2 M13 11a2 2 0 1 1-2-2h2",
  key: "M2 8a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M8 8h6 M12 8v2 M14 8v2",
  out: "M5 11l6-6 M6 5h5v5",
  caret: "M4 6l4 4 4-4",
  doc: "M4 2h6l3 3v9H4z M10 2v3h3 M6 8h5 M6 10h5 M6 12h3",
  arrow: "M2 8h11 M9 4l4 4-4 4",
  grid: "M3 3h4v4H3z M9 3h4v4H9z M3 9h4v4H3z M9 9h4v4H9z",
  coin: "M2 8a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M8 4v8 M6 6h3.5a1 1 0 0 1 0 2h-3h3a1 1 0 0 1 0 2H6",
  shield: "M8 2l5 2v4c0 3-2 5-5 6c-3-1-5-3-5-6V4z",
  lock: "M4 7h8v7H4z M6 7V5a2 2 0 0 1 4 0v2",
  screen: "M2 3h12v8H2z M6 14h4 M8 11v3",
  code: "M6 4L2 8l4 4 M10 4l4 4-4 4",
  hold: "M4 2h8 M4 14h8 M5 2c0 4 6 4 6 6s-6 2-6 6 M11 2c0 4-6 4-6 6s6 2 6 6",
  clock: "M2 8a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M8 4v4l3 2",
  spark: "M9 1L3 9h4l-1 6 6-8H8z",
  door: "M3 2h10v12H3z M6 2v12 M10 8h1",
  x: "M3 3l10 10 M13 3L3 13",
  git: "M4 3v10 M4 6c0 3 8 2 8 5 M12 11a1.5 1.5 0 1 0 0 .1 M4 3a1.5 1.5 0 1 0 0 .1",
  mail: "M2 4h12v8H2z M2 4l6 5 6-5",
  burger: "M2 5h12 M2 8h12 M2 11h12",
  close: "M3 3l10 10 M13 3L3 13",
};

export type IconName = keyof typeof P;
export function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" className={className} aria-hidden>
      <path d={P[name] || ""} />
    </svg>
  );
}
