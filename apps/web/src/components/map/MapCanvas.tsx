"use client";

import {
  GameHost,
  type MapCommands,
  type MapEvents,
  type MapRealm,
  type TypedEmitter,
  type WorldMapGame,
  worldMapFactory,
} from "@aiforge/games";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, readMapTheme } from "@/lib/map-data";

interface Props {
  realms: MapRealm[];
  onFocus: (n: number) => void;
  onSelect: (n: number) => void;
  /** Called if the map cannot start (for example no WebGL), so the page can fall back to the list. */
  onError: (message: string) => void;
}

type Send = (commands: TypedEmitter<MapCommands>) => void;

const KEYS: Record<string, Send> = {
  ArrowDown: (c) => c.emit("focus:step", { delta: 1 }),
  ArrowRight: (c) => c.emit("focus:step", { delta: 1 }),
  ArrowUp: (c) => c.emit("focus:step", { delta: -1 }),
  ArrowLeft: (c) => c.emit("focus:step", { delta: -1 }),
  Home: (c) => c.emit("focus:set", { n: 1 }),
  End: (c) => c.emit("focus:set", { n: 23 }),
  PageDown: (c) => c.emit("pan:by", { dy: 400 }),
  PageUp: (c) => c.emit("pan:by", { dy: -400 }),
  Enter: (c) => c.emit("select:focused", undefined),
  " ": (c) => c.emit("select:focused", undefined),
};

/**
 * The Phaser world map. Keyboard input is read here, on a real focusable
 * element, and forwarded to the game; Phaser's own keyboard handling is off.
 * The canvas is recreated when the theme or Focus mode changes so its colours
 * and motion always match the page.
 */
export default function MapCanvas({ realms, onFocus, onSelect, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<GameHost<MapEvents, MapCommands> | null>(null);
  const [themeVersion, setThemeVersion] = useState(0);

  // Keep the latest callbacks without restarting the game when they change.
  const handlers = useRef({ onFocus, onSelect, onError });
  handlers.current = { onFocus, onSelect, onError };

  useEffect(() => {
    const bump = () => setThemeVersion((v) => v + 1);
    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-focus"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", bump);
    motion.addEventListener("change", bump);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", bump);
      motion.removeEventListener("change", bump);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let host: GameHost<MapEvents, MapCommands>;
    try {
      host = new GameHost<MapEvents, MapCommands>(
        worldMapFactory({ realms, theme: readMapTheme(), reducedMotion: prefersReducedMotion(), seed: "aiforge-world-v1" }),
      );
    } catch (error) {
      // Never let a map problem take the page down: report it so the list view takes over.
      handlers.current.onError(error instanceof Error ? error.message : "The map could not start.");
      return;
    }
    hostRef.current = host;
    host.events.on("realm:focus", ({ n }) => handlers.current.onFocus(n));
    host.events.on("realm:select", ({ n }) => handlers.current.onSelect(n));
    host.events.on("error", ({ message }) => handlers.current.onError(message));
    host.mount(el).catch((error: unknown) => {
      handlers.current.onError(error instanceof Error ? error.message : "The map could not start.");
    });

    if (process.env.NODE_ENV !== "production") {
      // Handy for checking the map from the browser console during development.
      (window as unknown as { __aiforgeMap?: () => unknown }).__aiforgeMap = () =>
        (host.instance as WorldMapGame | null)?.snapshot() ?? null;
    }

    return () => {
      host.destroy(); // removes the canvas and every listener
      hostRef.current = null;
    };
  }, [realms, themeVersion]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const handler = KEYS[e.key];
    if (!handler || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const commands = hostRef.current?.commands;
    if (commands) handler(commands);
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-label="World map. Use the arrow keys to move between realms, Enter to open one, Page Up and Page Down to scroll."
      onKeyDown={onKeyDown}
      className="h-[70vh] min-h-[420px] w-full touch-none overflow-hidden rounded-[var(--radius)] border-2 border-border bg-surface-2"
    />
  );
}
