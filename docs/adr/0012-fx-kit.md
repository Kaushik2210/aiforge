# ADR 0012: One FX kit for anime-style game feel

Status: accepted, 2026-11-12

## Decision
Anime-style effects (hit-stop, camera shake, zoom punch, speed and focus lines,
shockwave rings, a cut-in banner) come from one small kit, not from effects
written separately in each scene.

- `packages/games/src/fx` is the kit. It has no Phaser import and draws nothing:
  you ask for an effect, call `update(dtMs)` each frame, and draw the `FxFrame` it
  returns. Time is passed in, so tests use fake time. 32 unit tests cover it.
- `HikerScene` is the first adapter: it applies the frame to the camera (shake, zoom),
  freezes its tweens during a hit-stop, and draws lines and rings with Graphics.
- The web app gets the same look for the XP reward moment with a CSS component,
  `components/fx/CutIn.tsx`, shown on level-up and new rank.
- Research and the ranked plan are in `research/09-anime-animation.md`.

## Why
- Effects share rules that must not drift: a reduced-motion switch, a strength
  level, caps, and a flash limit. One kit enforces them in one place.
- Tools that would give a richer look (Spine, Live2D, GSAP, Aseprite pipelines) are not
  open-source compatible with an MIT project or need paid editor licences. Phaser 4,
  CSS and Graphics cost nothing and need no art licence.
- The look comes from craft (holding frames, overshoot, freezing on impact, lines
  redrawn on twos), which code can do, with all drawing original.

## Accessibility rules the kit enforces
- Reduced motion (the OS setting or Focus mode) turns every effect off. The only
  survivor is a ring that fades in place without moving.
- Level 0 turns everything off, including the ring.
- Hit-stop is capped at 150 ms, zoom at 20%, shake trauma at 1, and a long pause
  (a background tab) cannot skip an effect in one step.
- `FlashLimiter` allows at most 2 flash events per rolling second and refuses a
  setting above 3, the WCAG 2.2 criterion 2.3.1 limit. Nothing uses full-screen
  flashes yet; the limiter exists for the impact frame planned later.
- The cut-in banner is `aria-hidden` (the XP toast announces the same thing and sits above
  the banner), takes no pointer events, and keeps its speed lines out from behind its words.
  Its lines are still: an earlier version flickered them on twos, and review found that
  striped flicker at about 12 changes per second is a flashing-pattern risk under
  WCAG 2.3.1, so it was removed. The only motion left is the slide.
- Inputs are validated: NaN, Infinity, huge counts and negative times are ignored or
  capped (no effect runs longer than 5 s, at most 200 lines), so one bad call cannot
  freeze the screen or exhaust memory.
- In Gradient Hiker the HUD is pinned against camera zoom and the camera has a solid
  background, so the zoom punch and shake never clip the text or show the page behind.

## Added on day 19
- **Afterimages**: `trace(x, y)` leaves up to four fading ghosts (240 ms life, at least
  7 px apart) behind something that moves. The Hiker uses it while it glides along the trail.
- **Impact frame**: `impactFrame()` is a dark ink overlay (alpha 0.7 then 0.35, each held
  about 83 ms, on twos at 24 fps). It is never white, needs level 2 or higher, is off under
  reduced motion, and goes through `FlashLimiter` (at most 1 start per second: review counted opposing luminance
  changes on the light theme, where 2 a second sits exactly on the WCAG limit of 3, so we
  keep a margin). Only the boss win uses it.
- **Effects setting**: Settings has an Off, Low, Normal (default) and High choice, stored on
  `<html data-fx>` and in localStorage like the theme, and applied before first paint. The
  Hiker game receives it as `fxLevel`; the level-up and boss cut-in banners use it for their
  length and are not shown at Off, nor under reduced motion or Focus mode (which override
  it). The boss banner sits at the top so it never overlaps a level-up banner, and it waits
  for the hiker's glide to finish.
- **Boss cut-ins** on the Hiker page: "BOSS BATTLE" when the boss level is picked and "BOSS
  DEFEATED" on a win.

## Costs and limits
- Only Gradient Hiker uses the Phaser adapter. The world map has no effects yet.
- Effect strength numbers (hit-stop 60 to 90 ms, shake 0.5, zoom 5%) are tuned by feel;
  published guidance disagrees. Not tested on low-end phones.
- Not built yet: cel-shading filters and pose stepping for mascots. The afterimage is a
  fading copy, not a true smear (a stretched frame along the motion).
- The afterimage and impact frame were checked with fake-time unit tests and end-to-end
  tests of the setting and banners; they were not captured on screen (a screenshot is too
  slow to catch effects that last a fraction of a second).
