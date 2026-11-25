import type { NextConfig } from "next";

// Paths that must never be moved under /console or /chat: API, assets, files with an extension,
// and paths that already point at the section.
const KEEP = "(?!api(?:/|$)|v1(?:/|$)|_next(?:/|$)|console(?:/|$)|chat(?:/|$)|.*\\.(?:png|jpe?g|webp|gif|svg|ico|txt|xml|webmanifest|woff2?|css|js|map|mp4|wav)$)"; // not "any dot": model ids like flux.1-schnell have dots

// 127.0.0.1 is allowed so local browser checks can load dev chunks (dev only).
// standalone: the server gets a self-contained build, so nothing is built on the small VPS.
const config: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  output: "standalone",
  // console.<domain> → /console/*, chat.<domain> → /chat. Done as internal rewrites (not middleware),
  // so it also works behind a TLS proxy, where a middleware rewrite tried to fetch https://localhost.
  async rewrites() {
    return {
      beforeFiles: (["console", "chat"] as const).flatMap((sub) => [
        { source: "/", has: [{ type: "host" as const, value: `${sub}\\..+` }], destination: `/${sub}` },
        { source: `/:path(${KEEP}.+)`, has: [{ type: "host" as const, value: `${sub}\\..+` }], destination: `/${sub}/:path` },
      ]),
    };
  },
};
export default config;
