import Link from "next/link";
import { REALMS } from "@/lib/realms";

/**
 * Winding quest path. Realms without content yet are shown as "coming soon"
 * (not locked behind progress: nothing here ever blocks a learner).
 */
export function RealmPath() {
  return (
    <section aria-labelledby="path-heading" className="mx-auto max-w-3xl px-4 py-12">
      <h2 id="path-heading" className="text-center text-3xl md:text-4xl">The quest map</h2>
      <p className="mx-auto mt-2 max-w-prose text-center text-text-muted">
        23 realms from your first line of Python to shipping a production AI system. One realm is open today; the rest
        are being forged one day at a time.
      </p>

      <ol className="realm-path mt-10">
        {REALMS.map((r) => {
          const open = Boolean(r.quest);
          const offset = [0, 1, 2, 1, 0, -1, -2, -1][(r.n - 1) % 8]!;
          const card = (
            <>
              <span
                aria-hidden="true"
                className={`realm-node ${open ? "realm-node-open" : "realm-node-soon"}`}
              >
                {r.n}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-text">{r.name}</span>
                <span className="block text-sm text-text-muted">{r.blurb}</span>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                    open ? "bg-primary text-on-primary" : "border border-border text-text-muted"
                  }`}
                >
                  {open ? "Open now" : "Coming soon"}
                </span>
              </span>
            </>
          );
          return (
            <li key={r.n} className="realm-step" style={{ ["--shift" as string]: offset }}>
              {open ? (
                <Link href={`/quests/${r.quest}/`} className="realm-card realm-card-open no-underline">
                  <span className="sr-only">Realm {r.n}: </span>
                  {card}
                </Link>
              ) : (
                <div className="realm-card realm-card-soon" aria-label={`Realm ${r.n}: ${r.name}, coming soon`}>
                  {card}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
