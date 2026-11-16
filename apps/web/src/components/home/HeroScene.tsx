import Link from "next/link";
import { AsciiHero } from "@/components/ascii/AsciiHero";
import { ScrambleText } from "@/components/ascii/ScrambleText";
import { BootLine } from "@/components/ascii/BootLine";
import { Mira } from "@/components/Mira";

/** Home hero: an animated ASCII skyline with falling code, under the headline and mascot. */
export function HeroScene() {
  return (
    <section className="hero relative overflow-hidden border-b border-border bg-bg" aria-labelledby="hero-title">
      <div className="speed-lines relative mx-auto grid max-w-6xl items-center gap-6 px-4 py-14 md:grid-cols-[1.4fr_1fr] md:py-20">
        <div className="reveal">
          <BootLine command="forge start gradient-descent" className="mb-2" />
          <p className="inline-block rounded-full bg-surface px-3 py-1 text-sm font-bold uppercase tracking-wide text-accent">
            Free &middot; open source &middot; no account
          </p>
          <h1 id="hero-title" className="mt-4 text-4xl leading-tight md:text-6xl">
            Level up into an <span className="text-primary"><ScrambleText text="AI engineer" /></span>
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
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <AsciiHero />
      </div>
    </section>
  );
}
