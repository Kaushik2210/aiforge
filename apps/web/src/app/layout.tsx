import type { Metadata, Viewport } from "next";
import { Dela_Gothic_One, JetBrains_Mono, Nunito_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "katex/dist/katex.min.css";
import "../styles/globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const display = Dela_Gothic_One({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Nunito_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AIForge", template: "%s | AIForge" },
  description: "A free, open-source, gamified academy that takes you from zero to production-ready AI engineer.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Runs before paint so the saved theme never flashes the wrong colours.
const themeInit = `try{var t=localStorage.getItem("aiforge-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;if(localStorage.getItem("aiforge-focus")==="on")document.documentElement.dataset.focus="on"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-text-muted">
          Code MIT. Lessons CC BY-SA 4.0. All characters and art are original to AIForge.
        </footer>
      </body>
    </html>
  );
}
