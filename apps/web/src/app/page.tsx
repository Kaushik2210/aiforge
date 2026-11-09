import Link from "next/link";
import { Mira } from "@/components/Mira";
import { StatusBar } from "@/components/StatusBar";
import { listQuests } from "@/lib/quests";

export default function Home() {
  const quests = listQuests();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="speed-lines grid items-center gap-6 rounded-[var(--radius)] border border-border bg-surface p-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Free and open source</p>
          <h1 className="mt-2 text-3xl md:text-4xl">Forge yourself into a production-ready AI engineer</h1>
          <p className="mt-4 max-w-prose text-text-muted">
            Short interactive lessons, real code that runs in your browser, and arcade challenges that make hard ideas
            click. No account needed; your progress stays on your device.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/quests/gradient-descent/"
              className="tap inline-flex items-center rounded-[var(--radius)] bg-primary px-5 font-semibold text-on-primary no-underline"
            >
              Start the first quest
            </Link>
          </div>
        </div>
        <div className="justify-self-center">
          <Mira mood="cheer" size={176} />
        </div>
      </section>

      <div className="mt-6">
        <p className="mb-2 text-sm text-text-muted">Preview values; real progress tracking arrives with the engine.</p>
        <StatusBar level={1} xp={40} xpToNext={100} streak={0} />
      </div>

      <section aria-labelledby="quests-heading" className="mt-8">
        <h2 id="quests-heading" className="text-2xl">Available quests</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quests.map((q) => (
            <li key={q.id} className="rounded-[var(--radius)] border border-border bg-surface p-4">
              <p className="text-sm text-text-muted">Realm {q.realm} &middot; {q.zone}</p>
              <h3 className="mt-1 text-xl">{q.title}</h3>
              <p className="mt-2 text-sm text-text-muted">About {q.estimatedMinutes} minutes &middot; 5 tiers</p>
              <Link href={`/quests/${q.id}/`} className="tap mt-3 inline-flex items-center font-semibold text-accent">
                Open quest
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
