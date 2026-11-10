import type { GameFactory, GameLike } from "../host";
import type { MapTheme } from "./biomes";
import type { MapCommands, MapEvents, MapRealm, MapSnapshot } from "./map-types";

export interface WorldMapConfig {
  realms: MapRealm[];
  theme: MapTheme;
  reducedMotion: boolean;
  seed: string;
}

/** The running map: a game plus a way to read its state (for tests and diagnostics). */
export interface WorldMapGame extends GameLike {
  snapshot(): MapSnapshot | null;
}

/**
 * Factory for GameHost. Phaser and the scene are loaded with dynamic imports,
 * so a page that never shows the map never downloads the engine.
 */
export function worldMapFactory(config: WorldMapConfig): GameFactory<MapEvents, MapCommands> {
  return async ({ container, events, commands, signal }) => {
    // Canvas text needs the web font loaded first or it renders in a fallback.
    try {
      await document.fonts?.ready;
    } catch {
      /* fonts API unavailable: carry on with fallback fonts */
    }
    const [Phaser, { WorldMapScene }] = await Promise.all([import("phaser"), import("./WorldMapScene")]);

    // The page was left while the engine was downloading: build nothing.
    if (signal.aborted) return { destroy() {}, snapshot: () => null } satisfies WorldMapGame;

    const fontFamily = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
    const scene = new WorldMapScene({ ...config, fontFamily, events, commands });

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: Math.max(320, container.clientWidth || 800),
      height: Math.max(320, container.clientHeight || 520),
      backgroundColor: config.theme.bg,
      scale: { mode: Phaser.Scale.RESIZE },
      banner: false,
      audio: { noAudio: true },
      // Phaser's own keyboard listens on the whole window and would hijack the
      // arrow keys everywhere; keys are forwarded from the focused page element.
      input: { keyboard: false, mouse: { preventDefaultWheel: false } },
      disableContextMenu: true,
      seed: [config.seed],
      scene,
    });

    // Wheel scrolls the map; at either end it falls through to the page so the
    // map never traps scrolling.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return; // browser zoom gesture
      if (scene.panBy(e.deltaY)) e.preventDefault();
    };
    container.addEventListener("wheel", onWheel, { passive: false });

    return {
      destroy(removeCanvas: boolean) {
        container.removeEventListener("wheel", onWheel);
        const canvas = game.canvas;
        game.destroy(removeCanvas);
        // Phaser finishes destroying on its next frame, which never comes in a
        // hidden tab. Remove the canvas now so a replaced map never lingers.
        if (removeCanvas) canvas?.remove();
      },
      snapshot: () => (game.scene.isActive("world-map") ? scene.getSnapshot() : null),
    } satisfies WorldMapGame;
  };
}
