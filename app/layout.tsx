import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const hero = Inter_Tight({ subsets: ["latin"], weight: ["300"], variable: "--font-hero" }); // home hero title only

export const metadata: Metadata = {
  title: { default: "Wisp · Anonymized AI, paid per use", template: "%s · Wisp" },
  description: "One wallet and one key for chat and image models, with your identity removed before any model sees a request.",
  icons: { icon: [{ url: "/icon.png", type: "image/png" }, { url: "/favicon-32.png", sizes: "32x32", type: "image/png" }], apple: "/apple-icon.png" },
};
export const viewport: Viewport = { themeColor: "#171717", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable} ${hero.variable}`}>
      <body>{children}</body>
    </html>
  );
}
