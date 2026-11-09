import type { ReactNode } from "react";

function Tile({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <article className={`rounded-[var(--radius)] border border-border bg-surface p-5 ${className}`}>
      <h3 className="text-xl">{title}</h3>
      <div className="mt-2 text-text-muted">{children}</div>
    </article>
  );
}

/** Bento grid explaining how the learning loop works. */
export function Bento() {
  return (
    <section aria-labelledby="bento-heading" className="mx-auto max-w-6xl px-4 py-12">
      <h2 id="bento-heading" className="text-center text-3xl md:text-4xl">How a quest plays</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Tile title="Five tiers deep" className="md:col-span-2">
          <p>Every topic climbs the same ladder, so you never stop at the shallow end.</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-5">
            {["Intuition", "Mechanics", "Build it", "Production", "Frontier"].map((t, i) => (
              <li key={t} className="rounded-lg bg-surface-2 p-2 text-center text-sm font-semibold text-text">
                <span className="block text-xs text-accent">L{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </Tile>

        <Tile title="A streak that forgives (planned)">
          <p>Earn a freeze every 7 days. Miss a day and you come back to a bonus, not a scolding.</p>
          <p className="mt-3 flex items-center gap-2 font-semibold text-text">
            <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full bg-primary" /> Example: 7-day streak, 1 freeze ready
          </p>
        </Tile>

        <Tile title="Code that runs here (coming Days 4-5)">
          <p>Python will run in your browser, with tests that turn green. No setup, no account. Today the challenges run locally with the repo's test script.</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 text-sm text-text">
            <code>{"PASS test_first_step\nPASS test_converges\nFAIL test_diverges"}</code>
          </pre>
        </Tile>

        <Tile title="Bosses and reviews (planned)" className="md:col-span-2">
          <p>
            Every quest will end with a boss: mixed questions and a coding challenge, 80% to clear, unlimited retries.
            Spaced repetition brings old ideas back before you forget them.
          </p>
          <div
            role="img"
            aria-label="Boss health bar at 60 percent"
            className="mt-3 h-5 overflow-hidden rounded-full border border-border bg-surface-2"
          >
            <div className="h-full w-3/5 bg-danger" />
          </div>
          <p className="mt-1 text-sm">Example: Gradient Boss at 60% HP</p>
        </Tile>

        <Tile title="Honest about depth" className="md:col-span-3">
          <p>
            Every lesson cites primary sources, dates the facts that go stale, and marks anything unverified. If we get
            something wrong, there is an issue template for exactly that.
          </p>
        </Tile>
      </div>
    </section>
  );
}
