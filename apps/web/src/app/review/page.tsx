import type { Metadata } from "next";
import { ReviewTavern } from "@/components/review/ReviewTavern";
import { getCatalog } from "@/lib/catalog";

export const metadata: Metadata = { title: "Review Tavern" };

export default function ReviewPage() {
  const { decks } = getCatalog();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl md:text-4xl">Review Tavern</h1>
      <p className="mt-2 max-w-prose text-text-muted">
        Take a seat and review your flashcards. Cards you know come back later and later; cards you miss come back
        sooner. Ten minutes a few times a week beats an hour once.
      </p>
      <div className="mt-6">
        <ReviewTavern decks={decks} />
      </div>
    </div>
  );
}
