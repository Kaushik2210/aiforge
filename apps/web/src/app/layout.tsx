import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "katex/dist/katex.min.css";
import "../styles/globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { ProgressInit } from "@/components/progress/ProgressInit";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AIForge", template: "%s | AIForge" },
  description: "A free, open-source, gamified academy that takes you from zero to production-ready AI engineer.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Runs before paint so the saved theme never flashes the wrong colours.
const themeInit = `try{var t=localStorage.getItem("aiforge-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;if(localStorage.getItem("aiforge-focus")==="on")document.documentElement.dataset.focus="on";var f=localStorage.getItem("aiforge-fx");if(f==="0"||f==="1"||f==="2"||f==="3")document.documentElement.dataset.fx=f;if(localStorage.getItem("aiforge-ascii")==="on")document.documentElement.dataset.ascii="on"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        <SiteHeader />
        <ProgressInit />
        <main id="main" tabIndex={-1}>{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-text-muted">
          <p>Code MIT. Lessons CC BY-SA 4.0. All characters and art are original to AIForge.</p>
          <p className="mt-1">Motion by GSAP (free under its standard licence) and 3D by three.js (MIT). The ASCII effects are written for this project.</p>
        </footer>
      </body>
    </html>
  );
}
