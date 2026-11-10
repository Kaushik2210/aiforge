# ADR 0006: Phaser integration and the world map

Status: accepted, 2026-11-10

## Integration rules (from the brief, now enforced in code)
- **Lazy.** Phaser (about 1.3 MB minified) is loaded with a dynamic `import()`
  only when the map is shown. Measured on the production build: the home page
  loads 8 scripts (577 KB) and no Phaser; `/map` fetches the Phaser chunk.
- **One game at a time.** `GameHost` (in `@aiforge/games`) owns the lifecycle.
  Mounting a second game destroys the first. Destroying is safe at any moment:
  before the engine finished loading, twice, or after a failure.
- **No leaks.** Teardown aborts a signal, clears both event channels, destroys
  the game and removes the canvas immediately (Phaser finishes `destroy()` on its
  next frame, which never comes in a hidden tab).
- **Typed bus.** Game to page events and page to game commands are separate
  `TypedEmitter`s with checked names and payloads; one handler's error never
  stops the others.
- **Seeded RNG.** `Rng` (mulberry32) is independent of Phaser, so game logic is
  deterministic and testable. Scenery uses a forked generator per realm, so
  changing one realm never reshuffles another.
- **Keyboard** is read from a focusable page element and forwarded; Phaser's own
  window-level keyboard is off so arrow keys are never hijacked.
- **Wheel** scrolls the map and falls through to the page at either end, so the
  map never traps scrolling.

## World map
23 realms along a winding path, one original biome band each, drawn only with
Graphics and Text (no downloaded art, works offline). Realms with no content yet
sit under a light fog but can still be focused and read; nothing is locked.
Colours come from the page's CSS tokens, so light and dark themes both work, and
the canvas is rebuilt when the theme or Focus mode changes.

## Accessibility
- The graphical map is not the only way in: a **list view** shows the same realms
  and is the default on phones, when the map cannot start, and is one tap away.
- The map is a focusable group with arrow keys, Home/End, Page Up/Down, Enter;
  the focused realm is announced through a live region and a details panel.
- Focus mode and OS reduced motion switch off the pulsing halo and make camera
  moves instant.
- Focus ring uses two rings (text colour plus gold) so it shows on every biome in
  both themes.

## What is tested
- Pure logic with unit tests (58): RNG, event bus, host lifecycle with a fake game
  (races, failures, one-at-a-time), layout (no overlaps, bands tile the world,
  scenery never covers a node), spline path through every node, camera fit, colours.
- The Phaser scene itself needs a canvas, so it was verified in a real browser:
  renders in dark and light, click selects, drag pans without selecting, keyboard
  navigation, canvas count stays at 1 across rapid theme flips and drops to 0 on
  switching to the list.
- Bugs found that way: the light theme crashed because CSS minifiers rewrite
  `#ffffff` as `#fff` (parser now accepts shorthand, with a safe fallback and a
  test); scenery clearance was checked before rounding (test caught it); yellow
  text and a cream focus ring were unreadable in light mode.

## Known limits
- On phones the map's text is small (minimum zoom 0.4). A narrow-screen layout is
  future work; the UI says so and offers the list.
- No automated browser test of the canvas yet (Playwright, Days 11-12).
- The pulsing halo is skipped under reduced motion but other camera motion
  (drag) is user-driven by design.
