# Research notes: Phaser 4 (platform, for the mini-game layer)

Accessed 2026-11-10. Read from the installed package itself (`phaser@4.2.1`,
npm `latest` at the time), so the notes match the version we ship.

## Sources
1. `phaser@4.2.1` package: `changelog/v4/4.0/MIGRATION-GUIDE.md`
   (also at https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md).
   Best for: every breaking change from v3. Resolves the Day 1 TODO-VERIFY.
2. `phaser@4.2.1` package: `types/phaser.d.ts`. Best for: exact config keys and
   method signatures (used instead of memory).
3. https://github.com/phaserjs/phaser/releases: v4.0.0 on 10 Apr 2026, 4.1.0 on
   30 Apr, 4.2.0 on 19 Jun, 4.2.1 on 9 Jul. (The Day 1 brief said 4.1.0 was latest.)

## Facts that matter to us
- Entry points: `exports["."].import` is `dist/phaser.esm.js` (about 8.8 MB
  unminified, 1.38 MB minified file also shipped). The ES build has **named
  exports** (`Game`, `Scene`, `Scale`, `AUTO`, `WEBGL`, `Math`, ...) plus a
  default, so `await import("phaser")` gives a namespace with `Phaser.Game`.
- Renderer: brand-new WebGL renderer built on render nodes; the v3 pipeline
  system is gone. Standard Sprite/Text/Graphics code works unchanged. Canvas is
  still available but deprecated. We use `Phaser.AUTO` and draw only with
  Graphics and Text, so we avoid every renderer-specific breaking change.
- Do not make raw `gl` calls; use an `Extern` object if ever needed.
- `roundPixels` now defaults to `false` (was `true` in v3).
- `Geom.Point` is removed (use `Math.Vector2`); `Math.TAU` is now 2*PI and
  `Math.PI2` is removed; `Struct.Set`/`Struct.Map` are native `Set`/`Map`.
- `setTintFill()` removed: use `setTint(c).setTintMode(Phaser.TintModes.FILL)`.
- `GameConfig` keys we use (verified in the type definitions): `type`, `parent`
  (HTMLElement or id), `backgroundColor`, `scale` (mode `Phaser.Scale.RESIZE`),
  `banner`, `audio`, `input` (boolean or config), `seed` (string[]),
  `disableContextMenu`, `render`, `fps`.
- `Game#destroy(removeCanvas: boolean, noReturn?: boolean)` tears a game down.
- Phaser ships a seeded `Math.RandomDataGenerator` (seeds are strings). We use
  our own tiny seeded RNG in the game package instead, so game logic is pure
  and testable without Phaser, and does not change if Phaser changes.
- Keyboard: Phaser listens on `window` by default. We turn Phaser's keyboard
  off and forward keys from the focused page element, so arrow keys never get
  hijacked page-wide and keyboard behaviour is accessible and testable.
- `Game#destroy()` completes on the engine's next frame (observed in a browser: for
  a moment the old and new canvases coexist). Frames do not run in a hidden tab, so
  the game wrapper also removes the canvas element immediately.
- Colours read back from CSS custom properties may be minified to shorthand
  (`#ffffff` becomes `#fff`); the parser accepts both. This crashed the light
  theme until a browser run caught it (a unit test now guards it).
- The package declares agent skills; `pnpm` asks to approve them. We do not
  approve or use them.

## Caveats
- The map scene was verified by running it in a browser; Phaser needs a canvas
  so it cannot run in Node unit tests. Pure logic (layout, RNG, events, host
  lifecycle with a fake game) is unit-tested.
