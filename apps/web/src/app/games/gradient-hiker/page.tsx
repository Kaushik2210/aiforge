import type { Metadata } from "next";
import Link from "next/link";
import { HikerGame } from "@/components/hiker/HikerGame";

export const metadata: Metadata = { title: "Gradient Hiker" };

export default function HikerPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-sm text-text-muted">Realm 2 &middot; Loss Mountains &middot; companion game for Gradient Descent</p>
      <h1 className="mt-1 text-3xl md:text-4xl">Gradient Hiker</h1>
      <p className="mt-2 max-w-prose text-text-muted">
        Walk downhill with a learning rate you choose. Every step is exactly the rule from the lesson:
        <code className="mx-1 rounded bg-surface-2 px-1">x = x - lr * gradient</code>
        (with optional momentum from level 3). Nothing is hidden.
      </p>
      <div className="mt-6">
        <HikerGame />
      </div>
      <p className="mt-8 text-sm text-text-muted">
        Want the maths behind it? Read the{" "}
        <Link href="/quests/gradient-descent/" className="font-semibold text-accent underline">
          Gradient Descent quest
        </Link>
        .
      </p>
    </div>
  );
}
