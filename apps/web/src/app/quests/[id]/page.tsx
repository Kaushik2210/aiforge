import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readLesson, readQuiz } from "@aiforge/content-schema";
import { Mira } from "@/components/Mira";
import { Quiz } from "@/components/mdx/Quiz";
import { compileLesson, lessonComponents } from "@/lib/mdx";
import { TIER_LABELS, getQuest, listQuests } from "@/lib/quests";

export function generateStaticParams() {
  return listQuests().map((q) => ({ id: q.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: getQuest(id)?.title ?? "Quest" };
}

export default async function QuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quest = getQuest(id);
  if (!quest) notFound();
  const Lesson = await compileLesson(readLesson(quest.dir).body);
  const quiz = readQuiz(quest.dir);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-text-muted">Realm {quest.realm} &middot; {quest.zone}</p>
      <h1 className="mt-1 text-3xl md:text-4xl">{quest.title}</h1>
      <p className="mt-2 text-text-muted">About {quest.estimatedMinutes} minutes. Verified {quest.verifiedOn}.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Depth ladder" className="h-fit rounded-[var(--radius)] border border-border bg-surface p-4">
          <h2 className="text-lg">Depth ladder</h2>
          <ol className="mt-3 space-y-2">
            {quest.tiers.map((t) => (
              <li key={t} className="rounded-lg bg-surface-2 p-3">
                <span className="font-semibold">{t} &middot; {TIER_LABELS[t]?.name}</span>
                <span className="block text-sm text-text-muted">{TIER_LABELS[t]?.blurb}</span>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-6">
          <section aria-labelledby="fund" className="rounded-[var(--radius)] border-2 border-accent bg-surface p-5">
            <h2 id="fund" className="text-xl">Core Fundamentals</h2>
            <p className="mt-1 text-sm text-text-muted">Explain these from memory.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {quest.coreFundamentals.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </section>

          <section aria-labelledby="cx" className="rounded-[var(--radius)] border-2 border-primary bg-surface p-5">
            <h2 id="cx" className="text-xl">Core Complexity</h2>
            <p className="mt-1 text-sm text-text-muted">The counter-intuitive parts that trip people up.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {quest.coreComplexity.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </section>

          <section aria-labelledby="eib" className="flex flex-wrap items-center gap-4 rounded-[var(--radius)] border border-border bg-surface p-5">
            <Mira mood="thinking" size={96} />
            <div className="min-w-0 flex-1">
              <h2 id="eib" className="text-xl">Explain it back</h2>
              <p className="mt-2">{quest.explainItBack.prompt}</p>
            </div>
          </section>

          <article className="lesson" aria-label="Lesson">
            <Lesson components={lessonComponents} />
          </article>

          <Quiz questions={quiz} />

          <p className="rounded-[var(--radius)] bg-surface-2 p-4 text-sm text-text-muted">
            The in-browser code editor arrives with the Python runner (Days 4-5).
          </p>
        </div>
      </div>
    </div>
  );
}
