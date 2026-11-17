"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LossScene, type LossSceneHandle } from "@/components/scene/LossScene";
import { readMotionMode, type MotionMode } from "@/lib/motion-mode";
import { STEPS, descentPath, pointAt, stepAt } from "@/lib/landscape";

const BEATS = [
  { from: 0, text: "Start high. The loss is large." },
  { from: 0.3, text: "Feel the slope, step downhill." },
  { from: 0.78, text: "Settle in a valley. That is training." },
] as const;

type Mode = "pending" | MotionMode;

/**
 * The home hero: a real 3D loss landscape. As you scroll, a ball runs gradient descent down it
 * (GSAP drives the scroll, three.js draws the scene). With reduced motion, Focus mode or effects
 * off it is one still picture of the finished run, with no scroll effects at all.
 */
export function HeroScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<LossSceneHandle>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const beatRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [mode, setMode] = useState<Mode>("pending");
  const [themeKey, setThemeKey] = useState(0);
  const [noWebgl, setNoWebgl] = useState(false);

  // Decide once the page is up, and again if the learner changes a setting.
  useEffect(() => {
    const sync = () => setMode(readMotionMode());
    sync();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", sync);
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const retheme = () => setThemeKey((k) => k + 1);
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

  // GSAP: the intro and the scroll-driven descent. Loaded only when motion is allowed.
  useEffect(() => {
    if (mode !== "animated" || noWebgl) return;
    const section = sectionRef.current;
    if (!section) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    const path = descentPath();

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        // intro: lines slide up out of a mask (movement only, so text stays fully readable)
        gsap.from(".hero-in", { y: 22, clipPath: "inset(0 0 100% 0)", duration: 0.8, ease: "power3.out", stagger: 0.09, clearProps: "clipPath,transform" });

        const proxy = { p: 0 };
        const paint = () => {
          sceneRef.current?.setProgress(proxy.p);
          const here = pointAt(path, proxy.p);
          if (readoutRef.current) readoutRef.current.textContent = `step ${stepAt(path, proxy.p)} of ${STEPS}   loss ${(here.y).toFixed(2)}`;
          const active = BEATS.reduce((a, b, i) => (proxy.p >= b.from ? i : a), 0);
          beatRefs.current.forEach((el, i) => {
            if (el) el.style.opacity = i === active ? "1" : "0";
          });
        };
        paint();
        gsap.to(proxy, {
          p: 1,
          ease: "none",
          onUpdate: paint,
          scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 0.8 },
        });

        // the rest of the home page eases in as it is scrolled to (movement only)
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, { y: 36, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
        });
      }, section.parentElement ?? section);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [mode, noWebgl]);

  const still = mode === "still" || noWebgl;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      data-mode={still ? "still" : "animated"}
      className="hero-tall relative border-b border-border"
    >
      <div className="hero-sticky">
        <div className="hero-poster" aria-hidden="true" />
        {mode !== "pending" && !noWebgl && (
          <div className="hero-canvas">
            <LossScene
              key={themeKey}
              ref={sceneRef}
              initialProgress={still ? 1 : 0}
              parallax={!still}
              onUnavailable={() => setNoWebgl(true)}
            />
          </div>
        )}

        <div className="hero-scrim" aria-hidden="true" />

        <div className="hero-copy mx-auto flex h-full w-full max-w-6xl flex-col justify-center px-4 py-16">
          <p className="hero-in w-fit rounded-full border border-border bg-surface px-3 py-1 text-sm font-semibold text-accent">
            Free &middot; open source &middot; no account
          </p>
          <h1 id="hero-title" className="hero-in mt-5 max-w-[13ch] text-5xl font-semibold leading-[1.02] md:text-7xl">
            Level up into an AI engineer
          </h1>
          <p className="hero-in mt-5 max-w-[34rem] text-lg text-text-muted">
            Bite-sized quests, in-browser code challenges and bosses, with a streak that forgives you. From your first
            gradient to a production system, built in the open.
          </p>
          <div className="hero-in mt-7 flex flex-wrap gap-3">
            <Link
              href="/quests/gradient-descent/"
              className="tap inline-flex items-center rounded-full bg-primary px-7 text-lg font-semibold text-on-primary no-underline transition-transform hover:-translate-y-0.5"
            >
              Begin Quest 1
            </Link>
            <a href="#path-heading" className="tap inline-flex items-center rounded-full border border-border bg-surface px-7 font-semibold text-text no-underline">
              See the map
            </a>
          </div>
          <p className="hero-in mt-8 max-w-prose text-sm text-text-muted">
            The surface behind this text is a real loss landscape with two valleys. The ball takes plain gradient
            descent steps, <code className="rounded bg-surface-2 px-1">x = x - lr * gradient</code>, which is the first
            thing you learn in Quest 1.
          </p>
        </div>

        <div aria-hidden="true" className="hero-hud">
          <div className="relative h-6">
            {BEATS.map((b, i) => (
              <p
                key={b.text}
                ref={(el) => {
                  beatRefs.current[i] = el;
                }}
                className="absolute inset-0 text-sm font-semibold text-text"
                style={{ opacity: still ? (i === BEATS.length - 1 ? 1 : 0) : i === 0 ? 1 : 0 }}
              >
                {b.text}
              </p>
            ))}
          </div>
          <p ref={readoutRef} className="mt-1 whitespace-pre font-mono text-xs text-text-muted">
            {still ? `step ${STEPS} of ${STEPS}   loss ${descentPath().at(-1)!.y.toFixed(2)}` : `step 0 of ${STEPS}`}
          </p>
        </div>
      </div>
    </section>
  );
}
