import Link from "next/link";
import { Hud } from "./progress/Hud";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="tap order-1 flex items-center font-display text-xl text-text no-underline">
          AI<span className="text-primary">Forge</span>
        </Link>
        <nav aria-label="Primary" className="order-3 flex w-full items-center gap-1 sm:order-2 sm:w-auto">
          <Link href="/" className="tap flex items-center rounded px-3 text-text hover:bg-surface-2">Home</Link>
          <Link href="/quests/gradient-descent/" className="tap flex items-center rounded px-3 text-text hover:bg-surface-2">
            First quest
          </Link>
          <Link href="/map/" className="tap flex items-center rounded px-3 text-text hover:bg-surface-2">Map</Link>
          <Link href="/settings/" className="tap flex items-center rounded px-3 text-text hover:bg-surface-2">Settings</Link>
        </nav>
        <div className="order-2 sm:order-3">
          <Hud />
        </div>
        <div className="order-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
