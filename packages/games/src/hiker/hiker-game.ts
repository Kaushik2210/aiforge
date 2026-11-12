import { GameHost, type GameFactory, type GameLike } from "../host";
import type { MapTheme } from "../map/biomes";
import type { GameContext, MiniGame } from "../types";
import { HikerSession, type SessionOptions } from "./session";

type NoEvents = Record<string, never>;

export interface GradientHikerOptions extends SessionOptions {
  theme: MapTheme;
}

/**
 * Gradient Hiker as a MiniGame. The rules and state live in `session` (also used
 * by the on-page sliders and the accessible table); this class only puts the
 * Phaser picture on the page and reports the result. Phaser is loaded lazily.
 */
export class GradientHiker implements MiniGame {
  readonly id = "gradient-hiker";
  readonly session: HikerSession;
  private host: GameHost<NoEvents, NoEvents> | null = null;
  private offComplete: (() => void) | null = null;

  private theme: MapTheme;

  constructor(opts: GradientHikerOptions) {
    this.theme = opts.theme;
    this.session = new HikerSession(opts);
  }

  /** Use new colours the next time the picture is mounted. The play-through is kept. */
  setTheme(theme: MapTheme) {
    this.theme = theme;
  }

  mount(container: HTMLElement, ctx: GameContext): void {
    this.destroyView();
    this.offComplete = this.session.events.on("complete", (r) =>
      ctx.onComplete({ won: r.won, score: r.score, durationMs: r.durationMs }),
    );

    const factory: GameFactory<NoEvents, NoEvents> = async ({ container: el, signal }) => {
      try {
        await document.fonts?.ready; // canvas text needs the web font loaded first
      } catch {
        /* fonts API unavailable: use fallback fonts */
      }
      const [Phaser, { HikerScene }] = await Promise.all([import("phaser"), import("./HikerScene")]);
      if (signal.aborted) return { destroy() {} } satisfies GameLike;

      const fontFamily = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
      const scene = new HikerScene({
        session: this.session,
        theme: this.theme,
        reducedMotion: ctx.reducedMotion,
        ...(ctx.fxLevel !== undefined ? { fxLevel: ctx.fxLevel } : {}),
        seed: String(ctx.seed),
        fontFamily,
      });
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: el,
        width: Math.max(320, el.clientWidth || 640),
        height: Math.max(240, el.clientHeight || 360),
        backgroundColor: this.theme.bg,
        scale: { mode: Phaser.Scale.RESIZE },
        banner: false,
        audio: { noAudio: true },
        // The controls are real page elements, so the canvas takes no input at all:
        // touch, wheel and keys all keep working on the page around it.
        input: false,
        disableContextMenu: true,
        seed: [String(ctx.seed)],
        scene,
      });
      return {
        destroy(removeCanvas: boolean) {
          const canvas = game.canvas;
          game.destroy(removeCanvas);
          if (removeCanvas) canvas?.remove(); // Phaser finishes on its next frame; do not wait
        },
      } satisfies GameLike;
    };

    this.host = new GameHost<NoEvents, NoEvents>(factory);
    this.host.mount(container).catch((error: unknown) => {
      ctx.onError?.(error instanceof Error ? error.message : "The game could not start.");
    });
  }

  /** Remove the picture (and stop Phaser) but keep the play-through, for example in text-only mode. */
  unmount(): void {
    this.destroyView();
  }

  private destroyView() {
    this.offComplete?.();
    this.offComplete = null;
    this.host?.destroy();
    this.host = null;
  }

  destroy(): void {
    this.destroyView();
    this.session.dispose();
  }
}
