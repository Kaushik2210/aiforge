/** Result reported by a mini-game when the learner finishes. */
export interface GameResult {
  won: boolean;
  /** 0 to 1, used as one input to topic mastery. */
  score: number;
  durationMs: number;
}

export interface GameContext {
  difficulty: 1 | 2 | 3;
  /** Seed for the game's RNG so runs are replayable and testable. */
  seed: number;
  reducedMotion: boolean;
  onComplete(result: GameResult): void;
  /** Called if the game cannot start (for example no WebGL), so the page can offer an alternative. */
  onError?(message: string): void;
}

/** Every mini-game implements this so games are hot-swappable. */
export interface MiniGame {
  id: string;
  mount(container: HTMLElement, ctx: GameContext): void;
  destroy(): void;
}
