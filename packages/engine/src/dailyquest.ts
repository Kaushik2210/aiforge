import { localDateKey, type DateKey } from "./dates";
import type { ProgressSnapshot } from "./progress";
import { isDue, REVIEW_SESSION_MIN_CARDS } from "./srs";

/**
 * The Daily Quest: three small goals a day, one of each kind, with a bonus for
 * finishing all three.
 *
 * - The plan (`generateDailyQuest`) is deterministic from the date, so the same
 *   quest shows all day and on every device with the same progress.
 * - Completion (`evaluateDailyQuest`) is read from what the learner actually did
 *   today (the XP ledger and step times), never from the plan, so it cannot drift.
 * - Claiming is idempotent: the bonus is recorded in the ledger and paid once a day.
 * - Nothing about it is a lock or a penalty: skip it and nothing is lost.
 */

export type GoalKind = "step" | "review" | "build";

export interface QuestGoal {
  kind: GoalKind;
  title: string;
  detail: string;
  href: string;
}

export interface DailyQuest {
  date: DateKey;
  goals: [QuestGoal, QuestGoal, QuestGoal];
}

export interface CatalogQuest {
  id: string;
  title: string;
  tierIds: string[];
  challengeIds: string[];
}

export interface CatalogGame {
  id: string;
  title: string;
  href: string;
  levels: number;
}

export interface Catalog {
  quests: CatalogQuest[];
  games: CatalogGame[];
}

export interface QuestStatus {
  step: boolean;
  review: { done: boolean; cards: number };
  build: boolean;
  /** All three goals done. */
  complete: boolean;
  /** The bonus was already paid today. */
  claimed: boolean;
}

/** How many cards count as "a review set" (same number that counts for the streak). */
export const REVIEW_GOAL_CARDS = REVIEW_SESSION_MIN_CARDS;

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic pick: the same date and list always give the same item. */
function pickFor<T>(items: readonly T[], date: DateKey, salt: string): T {
  return items[hash(`${date}:${salt}`) % items.length]!;
}

/** The day a timestamp falls on, or null. */
const dayOf = (ms: number | null | undefined, zone: string): DateKey | null =>
  typeof ms === "number" ? localDateKey(ms, zone) : null;

/** What the learner has done today, read from the ledger and step times. */
export function evaluateDailyQuest(snap: ProgressSnapshot, today: DateKey, zone: string): QuestStatus {
  let reviewCards = 0;
  let build = false;
  let claimed = false;
  let stepFromLedger = false;
  for (const e of snap.ledger) {
    if (localDateKey(e.at, zone) !== today) continue;
    if (e.kind === "step") stepFromLedger = true;
    else if (e.kind === "review") reviewCards += Number.parseInt(e.ref, 10) || 0;
    else if (e.kind === "challenge" || e.kind === "game") build = true;
    else if (e.kind === "daily-quest") claimed = true;
  }
  const stepFromTimes = Object.values(snap.steps).some((t) => dayOf(t, zone) === today);
  const step = stepFromLedger || stepFromTimes;
  const review = { done: reviewCards >= REVIEW_GOAL_CARDS, cards: reviewCards };
  return { step, review, build, complete: step && review.done && build, claimed };
}

/** Today's three goals, chosen from the catalog and the learner's own progress. */
export function generateDailyQuest(catalog: Catalog, snap: ProgressSnapshot, today: DateKey, zone: string): DailyQuest {
  // 1. A step: a tier not finished before today (so the choice does not change once it is done).
  const tiers = catalog.quests.flatMap((q) => q.tierIds.map((t) => ({ q, t, id: `${q.id}:${t}` })));
  const fresh = tiers.filter(({ id }) => {
    const before = dayOf(snap.steps[id], zone);
    return before === null || before >= today;
  });
  const stepChoice = tiers.length ? pickFor(fresh.length ? fresh : tiers, today, "step") : null;
  const step: QuestGoal = stepChoice
    ? {
        kind: "step",
        title: `Work through ${stepChoice.q.title}, tier ${stepChoice.t}`,
        detail: "Read it, try the example, then mark the tier done on the quest page.",
        href: `/quests/${stepChoice.q.id}/`,
      }
    : { kind: "step", title: "Open a quest", detail: "Pick any quest and finish a tier.", href: "/skills/" };

  // 2. A review set. Counts for the streak too.
  const cards = Object.values(snap.cards);
  const due = cards.filter((c) => isDue(c, today)).length;
  const review: QuestGoal = {
    kind: "review",
    title: `Review ${REVIEW_GOAL_CARDS} flashcards`,
    detail:
      cards.length === 0
        ? "You have no flashcards yet: add a quest's cards in the Review Tavern first."
        : due > 0
          ? `${due} card${due === 1 ? " is" : "s are"} due today.`
          : "Nothing is due, but extra practice counts.",
    href: "/review/",
  };

  // 3. Something to build or play: an unpassed challenge or a game level.
  const options: QuestGoal[] = [];
  for (const q of catalog.quests) {
    for (const c of q.challengeIds) {
      const rec = snap.challenges[`${q.id}:${c}`];
      const passedBefore = rec?.passed && (dayOf(rec.firstPassAt, zone) ?? "") < today;
      if (!passedBefore) {
        options.push({ kind: "build", title: `Pass the challenge in ${q.title}`, detail: "Write the code and get the tests green.", href: `/quests/${q.id}/` });
      }
    }
  }
  for (const g of catalog.games) {
    const level = (hash(`${today}:${g.id}`) % g.levels) + 1;
    options.push({ kind: "build", title: `Play ${g.title}, level ${level}`, detail: "A few minutes with a learning rate.", href: g.href });
  }
  const build: QuestGoal = options.length
    ? pickFor(options, today, "build")
    : { kind: "build", title: "Build something", detail: "Open a quest and try a challenge.", href: "/skills/" };

  return { date: today, goals: [step, review, build] };
}
