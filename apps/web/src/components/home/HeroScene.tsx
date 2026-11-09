import Link from "next/link";
import { Mira } from "@/components/Mira";

/** Layered anime-style skyline: sky, moon, three mountain ridges, drifting petals. */
export function HeroScene() {
  const petals = Array.from({ length: 12 }, (_, i) => i);
  return (
    <section className="hero relative overflow-hidden border-b border-border" aria-labelledby="hero-title">
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 520"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--c-surface-2)" />
            <stop offset="1" stopColor="var(--c-bg)" />
          </linearGradient>
        </defs>
        <rect width="1200" height="520" fill="url(#sky)" />
        <circle cx="940" cy="140" r="64" fill="var(--c-xp)" opacity="0.9" />
        <circle cx="940" cy="140" r="104" fill="var(--c-xp)" opacity="0.18" />
        <path d="M0 360 L160 250 L300 330 L470 200 L650 340 L820 240 L1000 340 L1200 270 V520 H0Z"
          fill="color-mix(in srgb, var(--c-accent) 22%, var(--c-bg))" />
        <path d="M0 420 L120 340 L260 410 L430 310 L600 410 L790 330 L980 420 L1200 350 V520 H0Z"
          fill="color-mix(in srgb, var(--c-primary) 18%, var(--c-bg))" />
        <path d="M0 480 L200 430 L420 480 L640 440 L860 485 L1060 445 L1200 480 V520 H0Z"
          fill="color-mix(in srgb, var(--c-text) 14%, var(--c-bg))" />
      </svg>

      <div className="petals" aria-hidden="true">
        {petals.map((i) => (
          <span key={i} style={{ ["--i" as string]: i }} />
        ))}
      </div>

      <div className="speed-lines relative mx-auto grid max-w-6xl items-center gap-6 px-4 py-14 md:grid-cols-[1.4fr_1fr] md:py-20">
        <div className="reveal">
          <p className="inline-block rounded-full bg-surface px-3 py-1 text-sm font-bold uppercase tracking-wide text-accent">
            Free &middot; open source &middot; no account
          </p>
          <h1 id="hero-title" className="mt-4 text-4xl leading-tight md:text-6xl">
            Level up into an <span className="text-primary">AI engineer</span>
          </h1>
          <p className="mt-4 max-w-prose text-lg text-text-muted">
            Bite-sized quests, in-browser code challenges, arcade bosses and a streak that forgives you, all being built in
            the open. From your first gradient to a production system.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/quests/gradient-descent/"
              className="tap inline-flex items-center rounded-[var(--radius)] bg-primary px-6 text-lg font-bold text-on-primary no-underline shadow-[0_4px_0_0_var(--c-text)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
            >
              Begin Quest 1
            </Link>
            <a
              href="#path-heading"
              className="tap inline-flex items-center rounded-[var(--radius)] border-2 border-border bg-surface px-6 font-semibold text-text no-underline"
            >
              See the map
            </a>
          </div>
        </div>
        <div className="justify-self-center">
          <Mira mood="cheer" size={220} />
        </div>
      </div>
    </section>
  );
}
