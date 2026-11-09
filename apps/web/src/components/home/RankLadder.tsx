import { RANKS } from "@/lib/realms";

export function RankLadder() {
  return (
    <section aria-labelledby="rank-heading" className="mx-auto max-w-6xl px-4 py-12">
      <h2 id="rank-heading" className="text-center text-3xl md:text-4xl">Climb the ranks</h2>
      <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {RANKS.map((r, i) => (
          <li
            key={r}
            className={`rounded-[var(--radius)] border p-3 text-center ${
              i === 0 ? "border-primary bg-surface" : "border-border bg-surface-2"
            }`}
          >
            <span className="block text-xs font-bold text-accent">Rank {i + 1}</span>
            <span className="block font-display text-base leading-snug">{r}</span>
            {i === 0 && <span className="mt-1 block text-xs font-bold text-primary">You start here</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
