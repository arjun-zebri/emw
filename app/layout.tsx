import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR, Noto_Serif_Thai } from "next/font/google";
import localFont from "next/font/local";
import { IntroScript } from "@/components/motion/IntroScript";
import { MotionRuntime } from "@/components/motion/MotionRuntime";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SITE } from "@/lib/config";
import "./globals.css";

const boska = localFont({
  src: [
    { path: "./fonts/Boska-normal.woff2", weight: "200 900", style: "normal" },
    { path: "./fonts/Boska-italic.woff2", weight: "200 900", style: "italic" },
  ],
  variable: "--font-boska",
  display: "swap",
});

const switzer = localFont({
  src: [{ path: "./fonts/Switzer-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-switzer",
  display: "swap",
});

// Boska has no Thai or Hangul, so those scripts fall back to whatever the system has (a slanted Thai,
// a sans-serif Korean). These serifs follow Boska in the display stack, so every language on the
// page shares one upright serif voice. Self-hosted at build time; only the glyphs used are fetched.
const thai = Noto_Serif_Thai({ subsets: ["thai"], weight: ["300", "400"], variable: "--font-thai", display: "swap" });
const korean = Noto_Serif_KR({ weight: ["300", "400"], variable: "--font-korean", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
  openGraph: { siteName: SITE.name, type: "website", locale: "en_AU" },
};

export const viewport: Viewport = {
  themeColor: "#faf8f5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={`${boska.variable} ${switzer.variable} ${thai.variable} ${korean.variable}`} suppressHydrationWarning>
      <body>
        <IntroScript />
        <a href="#main" className="t-nav sr-only z-[100] bg-ink p-4 text-paper focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <MotionRuntime />
      </body>
    </html>
  );
}
