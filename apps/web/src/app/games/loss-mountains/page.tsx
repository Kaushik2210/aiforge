import type { Metadata } from "next";
import Link from "next/link";
import { LossMountains } from "@/components/hiker/LossMountains";

export const metadata: Metadata = { title: "Loss Mountains" };

export default function LossMountainsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-sm text-text-muted">Realm 2 &middot; companion game for Gradient Descent &middot; the text version</p>
      <h1 className="mt-1 text-3xl md:text-4xl">Loss Mountains</h1>
      <p className="mt-2 max-w-prose text-text-muted">
        The same walk downhill as Gradient Hiker, drawn with characters. The ball is <code className="rounded bg-surface-2 px-1">@</code>,
        each step leaves its number behind, and every step is <code className="rounded bg-surface-2 px-1">x = x - lr * gradient</code>.
        Everything on the board is also written out below it.
      </p>
      <div className="mt-6">
        <LossMountains />
      </div>
      <p className="mt-8 text-sm text-text-muted">
        Prefer the picture version? Play{" "}
        <Link href="/games/gradient-hiker/" className="font-semibold text-accent underline">Gradient Hiker</Link>. The maths is in the{" "}
        <Link href="/quests/gradient-descent/" className="font-semibold text-accent underline">Gradient Descent quest</Link>.
      </p>
    </div>
  );
}
