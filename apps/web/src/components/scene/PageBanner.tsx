"use client";

import { useEffect, useRef, useState } from "react";
import { LossScene, type LossSceneHandle } from "@/components/scene/LossScene";
import { readMotionMode, type MotionMode } from "@/lib/motion-mode";

interface Props {
  /** How far down the landscape the ball sits, from 0 (the start) to 1 (the valley floor). Real progress. */
  progress: number;
  /** Words shown beside the picture, for example "Level 3, 240 of 300 XP". The page also says this in text. */
  label: string;
  /** True while the real number is still loading, so the ball waits at the start instead of jumping. */
  loading?: boolean;
}

/**
 * A short 3D strip at the top of a page: the same loss landscape as the home page, with the ball
 * placed by your real progress. With motion allowed the ball rolls to its place once; otherwise it
 * is simply there. Decorative: hidden from assistive technology, because the page states the number in text.
 */
export function PageBanner({ progress, label, loading = false }: Props) {
  const sceneRef = useRef<LossSceneHandle>(null);
  const [mode, setMode] = useState<MotionMode | "pending">("pending");
  const [ready, setReady] = useState(false);
  const [noWebgl, setNoWebgl] = useState(false);
  const [themeKey, setThemeKey] = useState(0);
  const shown = useRef(0);
  const target = loading ? 0 : Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));

  useEffect(() => {
    const sync = () => setMode(readMotionMode());
    sync();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", sync);
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const retheme = () => {
      setReady(false);
      setThemeKey((k) => k + 1);
    };
    dark.addEventListener("change", retheme);
    const observer = new MutationObserver((records) => {
      sync();
      if (records.some((r) => r.attributeName === "data-theme")) retheme();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-focus", "data-fx"] });
    return () => {
      mq.removeEventListener("change", sync);
      dark.removeEventListener("change", retheme);
      observer.disconnect();
    };
  }, []);

  // Move the ball to its place: rolled by GSAP when motion is allowed, placed at once otherwise.
  useEffect(() => {
    if (!ready || mode === "pending") return;
    if (mode === "still") {
      shown.current = target;
      sceneRef.current?.setProgress(target);
      return;
    }
    let tween: { kill: () => void } | undefined;
    let cancelled = false;
    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const proxy = { p: shown.current };
      tween = gsap.to(proxy, {
        p: target,
        duration: Math.min(2.2, 0.6 + Math.abs(target - shown.current) * 2.4),
        ease: "power2.inOut",
        onUpdate: () => {
          shown.current = proxy.p;
          sceneRef.current?.setProgress(proxy.p);
        },
      });
    });
    return () => {
      cancelled = true;
      tween?.kill();
    };
  }, [ready, mode, target, themeKey]);

  const still = mode === "still";

  return (
    <div className="page-banner relative mb-6 h-40 overflow-hidden rounded-[var(--radius)] border border-border md:h-48" aria-hidden="true">
      <div className="hero-poster" />
      {mode !== "pending" && !noWebgl && (
        <div className="absolute inset-0">
          <LossScene
            key={themeKey}
            ref={sceneRef}
            framing="banner"
            initialProgress={still ? target : 0}
            onReady={() => setReady(true)}
            onUnavailable={() => setNoWebgl(true)}
          />
        </div>
      )}
      <p className="absolute bottom-2 left-3 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text">{label}</p>
    </div>
  );
}
