import { TypedEmitter } from "./events";

/**
 * Owns the life of one game on one page.
 *
 * Rules (from the project brief):
 * - only one game instance exists at a time: mounting a new one first destroys
 *   the previous one;
 * - the engine is created through an async factory (a dynamic import), never at
 *   module load, so pages that do not show a game never download it;
 * - destroying is safe at any moment: before the engine finished loading, twice,
 *   or after a failure, and it always removes listeners so nothing leaks.
 *
 * The host knows nothing about Phaser; it takes a factory that returns anything
 * with a `destroy()`. That keeps the lifecycle testable with a fake game.
 */

export interface GameLike {
  destroy(removeCanvas: boolean, noReturn?: boolean): void;
}

export interface HostContext<Events extends { [K in keyof Events]: unknown }, Commands extends { [K in keyof Commands]: unknown }> {
  container: HTMLElement;
  /** Game to page events. */
  events: TypedEmitter<Events>;
  /** Page to game commands (for example keyboard input). */
  commands: TypedEmitter<Commands>;
  /** Aborted when the host is destroyed; stop work when it fires. */
  signal: AbortSignal;
}

export type GameFactory<Events extends { [K in keyof Events]: unknown }, Commands extends { [K in keyof Commands]: unknown }> = (
  ctx: HostContext<Events, Commands>,
) => Promise<GameLike>;

export type HostState = "idle" | "loading" | "running" | "destroyed" | "failed";

// One game at a time across the whole page.
let active: { destroy(): void } | null = null;

/** For tests: forget the active host without destroying it. */
export function __resetActiveHost() {
  active = null;
}

export class GameHost<
  Events extends { [K in keyof Events]: unknown },
  Commands extends { [K in keyof Commands]: unknown },
> {
  readonly events = new TypedEmitter<Events>();
  readonly commands = new TypedEmitter<Commands>();

  private game: GameLike | null = null;
  private abort: AbortController | null = null;
  private _state: HostState = "idle";
  private mountId = 0;

  constructor(private readonly factory: GameFactory<Events, Commands>) {}

  get state(): HostState {
    return this._state;
  }

  /** The running game object, if it has finished loading. */
  get instance(): GameLike | null {
    return this.game;
  }

  /** Start the game inside `container`. Resolves when it is running (or failed). */
  async mount(container: HTMLElement): Promise<void> {
    if (active && active !== this) active.destroy();
    this.teardown();
    active = this;

    const id = ++this.mountId;
    const abort = new AbortController();
    this.abort = abort;
    this._state = "loading";

    try {
      const game = await this.factory({
        container,
        events: this.events,
        commands: this.commands,
        signal: abort.signal,
      });
      if (id !== this.mountId || abort.signal.aborted) {
        // Destroyed (or re-mounted) while the engine was still loading.
        safeDestroy(game);
        return;
      }
      this.game = game;
      this._state = "running";
    } catch (error) {
      if (id !== this.mountId) return;
      this._state = "failed";
      if (active === this) active = null;
      throw error;
    }
  }

  /** Stop the game and release everything. Safe to call any number of times. */
  destroy(): void {
    this.mountId++; // invalidates any mount still loading
    this.teardown();
    this.events.clear();
    this.commands.clear();
    if (active === this) active = null;
    this._state = "destroyed";
  }

  private teardown() {
    this.abort?.abort();
    this.abort = null;
    if (this.game) {
      safeDestroy(this.game);
      this.game = null;
    }
  }
}

function safeDestroy(game: GameLike) {
  try {
    game.destroy(true);
  } catch (error) {
    console.error("Error while destroying the game:", error);
  }
}
