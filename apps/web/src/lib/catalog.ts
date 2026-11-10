import path from "node:path";
import type { Catalog } from "@aiforge/engine";
import { readCards, readChallenges, type FlashcardContent } from "@aiforge/content-schema";
import { listQuests } from "./quests";

/** The mini-games available today. Each game id matches its `game-result` ids (`id:level-N`). */
export const GAMES = [
  { id: "gradient-hiker", title: "Gradient Hiker", href: "/games/gradient-hiker/", levels: 5 },
] as const;

export interface DeckInfo {
  questId: string;
  title: string;
  cards: FlashcardContent[];
}

/** Build-time view of the content for the Daily Quest and the Review Tavern. */
export function getCatalog(): { catalog: Catalog; decks: DeckInfo[] } {
  const quests = listQuests();
  const catalog: Catalog = {
    quests: quests.map((q) => ({
      id: q.id,
      title: q.title,
      tierIds: [...q.tiers],
      challengeIds: readChallenges(q.dir).map((c) => c.id),
    })),
    games: GAMES.map((g) => ({ ...g })),
  };
  const decks = quests.map((q) => ({ questId: q.id, title: q.title, cards: readCards(q.dir) }));
  return { catalog, decks };
}

export const CARD_ID = (questId: string, cardId: string) => `${questId}/${cardId}`;
export const CONTENT_ROOT = path.resolve(process.cwd(), "../../content");
