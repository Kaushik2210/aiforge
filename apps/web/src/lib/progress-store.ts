"use client";

import { create } from "zustand";
import { emptySnapshot, type ProgressEvent, type ProgressSnapshot, type ReduceResult } from "@aiforge/engine";
import {
  AIForgeDB,
  NewerVersionError,
  dispatchEvent,
  exportText,
  importText,
  loadSnapshot,
  resetAll,
  type ImportMode,
} from "./db";

export type StoreStatus = "loading" | "ready" | "memory-only" | "read-only";

export interface Reward {
  xpGained: number;
  levelUp: ReduceResult["levelUp"];
  rankUp: ReduceResult["rankUp"];
  /** Changes on every reward so a toast can re-trigger. */
  key: number;
}

interface ProgressState {
  status: StoreStatus;
  snapshot: ProgressSnapshot;
  notice: string | null;
  reward: Reward | null;
  init: () => Promise<void>;
  dispatch: (event: ProgressEvent) => Promise<ReduceResult | null>;
  exportText: () => Promise<string>;
  importText: (text: string, mode: ImportMode) => Promise<{ ok: true } | { ok: false; errors: string[] }>;
  reset: () => Promise<void>;
  dismissNotice: () => void;
}

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

let db: AIForgeDB | null = null;
let channel: BroadcastChannel | null = null;
let rewardKey = 0;

function getDb(): AIForgeDB {
  db ??= new AIForgeDB();
  return db;
}

const placeholder = () => emptySnapshot(zone(), Date.now());

export const useProgress = create<ProgressState>((set, get) => ({
  status: "loading",
  snapshot: placeholder(),
  notice: null,
  reward: null,

  async init() {
    if (get().status !== "loading") return;
    try {
      const r = await loadSnapshot(getDb(), zone(), Date.now());
      set({
        snapshot: r.snapshot,
        status: r.status === "newer-version" ? "read-only" : "ready",
        notice: r.message ?? null,
      });
      if (typeof BroadcastChannel !== "undefined" && !channel) {
        channel = new BroadcastChannel("aiforge-progress");
        // Another tab saved something: reload our copy so tabs never drift apart.
        channel.onmessage = async () => {
          try {
            const again = await loadSnapshot(getDb(), zone(), Date.now());
            if (again.status === "ok") set({ snapshot: again.snapshot });
          } catch { /* ignore */ }
        };
      }
    } catch {
      // IndexedDB unavailable (private window, blocked storage): keep going in memory.
      set({
        status: "memory-only",
        notice: "Your browser is blocking saved progress, so progress will only last until you close this tab. Use Settings to export it.",
      });
    }
  },

  async dispatch(event) {
    const { status } = get();
    if (status === "read-only") return null;
    const now = Date.now();
    try {
      if (status === "memory-only") {
        // No storage: still run the rules so the UI behaves the same.
        const { applyEvent } = await import("@aiforge/engine");
        const r = applyEvent(get().snapshot, event, now, zone());
        set({ snapshot: r.snapshot, reward: reward(r) });
        return r;
      }
      const r = await dispatchEvent(getDb(), event, now, zone());
      set({ snapshot: r.snapshot, reward: reward(r) });
      channel?.postMessage("changed");
      return r;
    } catch (err) {
      if (err instanceof NewerVersionError) {
        set({ status: "read-only", notice: err.message });
        return null;
      }
      set({ notice: "Could not save your progress just now. Your work on the page is safe; try again." });
      return null;
    }
  },

  async exportText() {
    if (get().status === "memory-only") {
      const { exportProgress } = await import("@aiforge/engine");
      return JSON.stringify(exportProgress(get().snapshot, Date.now()), null, 2);
    }
    return exportText(getDb(), Date.now(), zone());
  },

  async importText(text, mode) {
    if (get().status === "memory-only") return { ok: false, errors: ["Saved progress is unavailable in this browser."] };
    const res = await importText(getDb(), text, mode, Date.now(), zone());
    if (!res.ok) return res;
    set({ snapshot: res.snapshot, status: "ready", notice: null });
    channel?.postMessage("changed");
    return { ok: true };
  },

  async reset() {
    if (get().status === "memory-only") {
      set({ snapshot: placeholder() });
      return;
    }
    const fresh = await resetAll(getDb(), Date.now(), zone());
    set({ snapshot: fresh });
    channel?.postMessage("changed");
  },

  dismissNotice: () => set({ notice: null }),
}));

function reward(r: ReduceResult): Reward | null {
  if (r.xpGained <= 0 && !r.levelUp && !r.rankUp) return null;
  return { xpGained: r.xpGained, levelUp: r.levelUp, rankUp: r.rankUp, key: ++rewardKey };
}
