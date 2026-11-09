import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="tap flex items-center font-display text-xl text-text no-underline">
          AI<span className="text-primary">Forge</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          <Link href="/" className="tap flex items-center rounded px-3 text-text hover:bg-surface-2">Home</Link>
          <Link href="/quests/gradient-descent/" className="tap flex items-center rounded px-3 text-text hover:bg-surface-2">
            First quest
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
