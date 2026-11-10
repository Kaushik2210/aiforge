"use client";

import {
  RATINGS,
  REVIEW_SESSION_MIN_CARDS,
  answerCurrent,
  buildReviewQueue,
  cardsDone,
  currentCard,
  dayDiff,
  formatInterval,
  isDue,
  isFinished,
  isLeech,
  localDateKey,
  previewIntervals,
  sessionResult,
  startReviewSession,
  type Rating,
  type ReviewSessionState,
  type SessionResult,
} from "@aiforge/engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "@/lib/progress-store";

export interface DeckView {
  questId: string;
  title: string;
  cards: { id: string; front: string; back: string }[];
}

const cardKey = (questId: string, id: string) => `${questId}/${id}`;
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const LABEL: Record<Rating, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };
const HELP: Record<Rating, string> = {
  again: "I didn't know it",
  hard: "I got it, but it was a struggle",
  good: "I knew it",
  easy: "Too easy",
};
const btn =
  "tap rounded-[var(--radius)] border-2 border-border bg-surface px-4 font-semibold text-text disabled:opacity-50";

interface Finished {
  result: SessionResult;
  xp: number;
  streak: number;
  nextDueInDays: number | null;
}

/** The Review Tavern: a spaced-repetition sitting over your flashcards. */
export function ReviewTavern({ decks }: { decks: DeckView[] }) {
  const snapshot = useProgress((s) => s.snapshot);
  const status = useProgress((s) => s.status);
  const dispatch = useProgress((s) => s.dispatch);

  const [session, setSession] = useState<ReviewSessionState | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState<Finished | null>(null);
  const revealRef = useRef<HTMLButtonElement>(null);
  const goodRef = useRef<HTMLButtonElement>(null);

  const today = localDateKey(Date.now(), zone());
  const content = useMemo(() => {
    const map = new Map<string, { front: string; back: string; quest: string }>();
    for (const d of decks) for (const c of d.cards) map.set(cardKey(d.questId, c.id), { front: c.front, back: c.back, quest: d.title });
    return map;
  }, [decks]);

  const cards = Object.values(snapshot.cards).filter((c) => content.has(c.id));
  const dueCount = cards.filter((c) => isDue(c, today)).length;
  const canPractice = cards.length >= REVIEW_SESSION_MIN_CARDS;

  const planQueue = (extra: boolean) =>
    buildReviewQueue(cards, today, {
      limit: 20,
      seed: Number(today.replaceAll("-", "")),
      fillTo: extra ? REVIEW_SESSION_MIN_CARDS : 0,
    });
  const planned = planQueue(false).length;

  function begin(extra: boolean) {
    const queue = planQueue(extra);
    if (queue.length === 0) return;
    setFinished(null);
    setRevealed(false);
    setSession(startReviewSession(queue));
  }

  async function addDeck(deck: DeckView) {
    const ids = deck.cards.map((c) => cardKey(deck.questId, c.id));
    await dispatch({ type: "enroll-cards", topicId: deck.questId, cardIds: ids });
  }

  // Keep keyboard focus where the learner needs it: the reveal button, then "Good".
  useEffect(() => {
    if (!session || isFinished(session)) return;
    (revealed ? goodRef : revealRef).current?.focus();
  }, [session, revealed]);

  async function rate(rating: Rating) {
    if (!session) return;
    const next = answerCurrent(session, rating);
    setRevealed(false);
    if (!isFinished(next)) {
      setSession(next);
      return;
    }
    const result = sessionResult(next);
    const r = await dispatch({ type: "review-session", reviews: result.reviews });
    const after = r?.snapshot ?? snapshot;
    const dues = Object.values(after.cards)
      .filter((c) => content.has(c.id))
      .map((c) => dayDiff(today, c.due));
    setSession(null);
    setFinished({
      result,
      xp: r?.xpGained ?? 0,
      streak: after.streak.current,
      nextDueInDays: dues.length ? Math.max(0, Math.min(...dues)) : null,
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!session || e.altKey || e.ctrlKey || e.metaKey) return;
    if (!revealed && (e.key === " " || e.key === "Enter") && e.target === e.currentTarget) {
      e.preventDefault();
      setRevealed(true);
    } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
      e.preventDefault();
      void rate(RATINGS[Number(e.key) - 1]!);
    }
  }

  /* ----------------------------------------------------------- a sitting */
  if (session) {
    const card = currentCard(session)!;
    const view = content.get(card.id)!;
    const done = cardsDone(session);
    const intervals = previewIntervals(card, today);
    return (
      <div onKeyDown={onKeyDown} tabIndex={-1} className="space-y-4 outline-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">
            Card {Math.min(done + 1, session.total)} of {session.total}
          </p>
          <button type="button" className={btn} onClick={() => setSession(null)}>
            Stop here
          </button>
        </div>
        <div
          role="progressbar"
          aria-label="Progress through this sitting"
          aria-valuemin={0}
          aria-valuemax={session.total}
          aria-valuenow={done}
          className="h-3 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${(done / session.total) * 100}%` }} />
        </div>

        <article className="rounded-[var(--radius)] border-2 border-border bg-surface p-6">
          <p className="text-sm text-text-muted">{view.quest}</p>
          <p className="mt-2 text-2xl font-semibold">{view.front}</p>
          {isLeech(card) && (
            <p className="mt-2 text-sm text-text-muted">
              This card has been tricky many times. Try explaining it in your own words before you reveal it.
            </p>
          )}

          {!revealed ? (
            <button ref={revealRef} type="button" onClick={() => setRevealed(true)} className="tap mt-6 rounded-[var(--radius)] bg-primary px-6 font-bold text-on-primary">
              Show answer
            </button>
          ) : (
            <div aria-live="polite" className="mt-4 rounded-lg bg-surface-2 p-4">
              <p className="text-sm font-semibold text-accent">Answer</p>
              <p className="mt-1 text-lg">{view.back}</p>
            </div>
          )}
        </article>

        {revealed && (
          <div>
            <p className="mb-2 text-sm text-text-muted">How did it go? (keys 1 to 4)</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {RATINGS.map((r, i) => (
                <button
                  key={r}
                  ref={r === "good" ? goodRef : undefined}
                  type="button"
                  onClick={() => void rate(r)}
                  className={`${btn} flex-col py-2 text-left sm:text-center`}
                >
                  <span className="block">
                    {i + 1}. {LABEL[r]}
                  </span>
                  <span className="block text-xs font-normal text-text-muted">{HELP[r]}</span>
                  <span className="block text-xs font-normal text-text-muted">back in {formatInterval(intervals[r])}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ----------------------------------------------------- after a sitting */
  if (finished) {
    const { result } = finished;
    const counted = result.cardsReviewed >= REVIEW_SESSION_MIN_CARDS;
    return (
      <section aria-labelledby="done-h" className="space-y-4 rounded-[var(--radius)] border-2 border-primary bg-surface p-6">
        <h2 id="done-h" className="text-2xl">Sitting complete</h2>
        <p>
          You reviewed <strong>{result.cardsReviewed}</strong> card{result.cardsReviewed === 1 ? "" : "s"}
          {finished.xp > 0 && <> and earned <strong>{finished.xp} XP</strong></>}.
        </p>
        <ul className="grid gap-1 text-sm sm:grid-cols-4">
          {RATINGS.map((r) => (
            <li key={r}>
              {LABEL[r]}: <strong>{result.counts[r]}</strong>
            </li>
          ))}
        </ul>
        <p className="text-text-muted">
          {counted
            ? `That counts toward your streak (now ${finished.streak} day${finished.streak === 1 ? "" : "s"}).`
            : `A sitting of ${REVIEW_SESSION_MIN_CARDS} or more cards counts toward your streak; this one was ${result.cardsReviewed}.`}
          {finished.nextDueInDays !== null && ` Your next card is due ${finished.nextDueInDays === 0 ? "today" : `in ${formatInterval(finished.nextDueInDays)}`}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => setFinished(null)}>
            Back to the Tavern
          </button>
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------------- the deck */
  return (
    <div className="space-y-8">
      <section aria-labelledby="today-h" className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 id="today-h" className="text-xl">Today</h2>
        {status === "loading" ? (
          <p className="text-text-muted">Loading your deck...</p>
        ) : cards.length === 0 ? (
          <p className="mt-1 text-text-muted">You have no flashcards yet. Add a deck below to begin.</p>
        ) : (
          <>
            <p className="mt-1 text-lg">
              <strong>{dueCount}</strong> card{dueCount === 1 ? " is" : "s are"} due. You have {cards.length} in your deck.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={planned === 0} onClick={() => begin(false)} className="tap rounded-[var(--radius)] bg-primary px-6 font-bold text-on-primary disabled:opacity-50">
                Review {planned} card{planned === 1 ? "" : "s"}
              </button>
              {dueCount < REVIEW_SESSION_MIN_CARDS && canPractice && (
                <button type="button" onClick={() => begin(true)} className={btn}>
                  Practice {REVIEW_SESSION_MIN_CARDS} cards anyway
                </button>
              )}
            </div>
            <p className="mt-3 text-sm text-text-muted">
              A sitting of {REVIEW_SESSION_MIN_CARDS} or more cards counts toward your streak. Reviewing a card early is fine:
              the schedule adapts.
              {dueCount > planned && " A sitting adds at most 10 brand-new cards, so the others wait for next time."}
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="decks-h">
        <h2 id="decks-h" className="text-xl">Decks</h2>
        <ul className="mt-3 space-y-3">
          {decks.map((d) => {
            const enrolled = Object.values(snapshot.cards).filter((c) => c.topicId === d.questId);
            const due = enrolled.filter((c) => isDue(c, today)).length;
            const all = enrolled.length >= d.cards.length;
            return (
              <li key={d.questId} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
                <div>
                  <p className="font-semibold">{d.title}</p>
                  <p className="text-sm text-text-muted">
                    {enrolled.length} of {d.cards.length} cards in your deck{enrolled.length > 0 && `, ${due} due`}.
                  </p>
                </div>
                {!all && (
                  <button type="button" className={btn} disabled={status === "loading" || status === "read-only"} onClick={() => void addDeck(d)}>
                    Add {d.cards.length - enrolled.length} card{d.cards.length - enrolled.length === 1 ? "" : "s"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
