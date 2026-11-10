import { localDateKey, topicMastery, type ProgressSnapshot } from "@aiforge/engine";

export interface TopicRef {
  id: string;
  /** True when a quest with this id exists; planned topics have no evidence yet. */
  available: boolean;
}

export interface TopicScore {
  percent: number;
  label: string;
}

/** Mastery for each topic from the saved progress: quiz accuracy, flashcard retention and the best boss score. */
export function scoreTopics(snapshot: ProgressSnapshot, topics: readonly TopicRef[], zone: string, nowMs = Date.now()): Map<string, TopicScore> {
  const today = localDateKey(nowMs, zone);
  const scores = new Map<string, TopicScore>();
  for (const t of topics) {
    if (!t.available) {
      scores.set(t.id, { percent: 0, label: "Planned" });
      continue;
    }
    const boss = snapshot.bosses[`${t.id}-boss`];
    const m = topicMastery(
      {
        quiz: snapshot.quiz[t.id] ?? { attempts: 0, correct: 0 },
        cards: Object.values(snapshot.cards).filter((c) => c.topicId === t.id),
        bossBest: boss ? boss.best : null,
      },
      today,
    );
    scores.set(t.id, { percent: m.percent, label: m.label });
  }
  return scores;
}

export const localZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
