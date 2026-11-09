"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const attr = document.documentElement.dataset.theme;
    setTheme(attr === "light" || attr === "dark" ? attr : systemTheme());
    setFocusMode(document.documentElement.dataset.focus === "on");
  }, []);

  function toggleTheme() {
    const next: Theme = (theme ?? systemTheme()) === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem("aiforge-theme", next); } catch { /* storage may be blocked */ }
  }

  function toggleFocus() {
    const next = !focusMode;
    if (next) document.documentElement.dataset.focus = "on";
    else delete document.documentElement.dataset.focus;
    setFocusMode(next);
    try { localStorage.setItem("aiforge-focus", next ? "on" : "off"); } catch { /* ignore */ }
  }

  const btn =
    "tap rounded-[var(--radius)] border border-border bg-surface px-3 text-sm font-semibold text-text hover:bg-surface-2";

  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={toggleFocus} aria-pressed={focusMode}>
        Focus mode: {focusMode ? "on" : "off"}
      </button>
      <button type="button" className={btn} onClick={toggleTheme} aria-label="Switch between light and dark theme">
        {theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Theme"}
      </button>
    </div>
  );
}
