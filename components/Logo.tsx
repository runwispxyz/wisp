// Wisp mark: a six-petal flower with a pinwheel cut. The shape is public/brand/mark.png used as a mask,
// so the colour comes from CSS (default: the text colour, as in the supplied logo).
export function Mark({ size = 20, color = "var(--text)" }: { size?: number; color?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block", flex: "none", width: size, height: size, background: color,
        WebkitMask: "url(/brand/mark.png) center / contain no-repeat", mask: "url(/brand/mark.png) center / contain no-repeat",
      }}
    />
  );
}

export function Logo({ suffix }: { suffix?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600, letterSpacing: "-0.01em", fontSize: 17 }}>
      <Mark size={22} />
      wisp
      {suffix && <span style={{ color: "var(--accent)", fontWeight: 500 }}>{suffix}</span>}
    </span>
  );
}
