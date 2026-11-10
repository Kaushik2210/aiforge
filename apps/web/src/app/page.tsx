import Link from "next/link";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { Bento } from "@/components/home/Bento";
import { HeroScene } from "@/components/home/HeroScene";
import { RankLadder } from "@/components/home/RankLadder";
import { RealmPath } from "@/components/home/RealmPath";
import { getCatalog } from "@/lib/catalog";

export default function Home() {
  return (
    <>
      <HeroScene />
      <div className="mx-auto max-w-5xl px-4 pt-10">
        <TodayPanel catalog={getCatalog().catalog} />
      </div>
      <Bento />
      <RealmPath />
      <RankLadder />
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-3xl md:text-4xl">Ready for Quest 1?</h2>
        <p className="mt-3 text-text-muted">Gradient Descent takes about two hours, and you can stop any time.</p>
        <Link
          href="/quests/gradient-descent/"
          className="tap mt-6 inline-flex items-center rounded-[var(--radius)] bg-primary px-6 text-lg font-bold text-on-primary no-underline"
        >
          Begin Quest 1
        </Link>
      </section>
    </>
  );
}
