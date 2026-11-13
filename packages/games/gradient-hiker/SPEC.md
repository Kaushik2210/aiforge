# Gradient Hiker (spec)

Implementation scheduled for Day 9. Quest: Gradient Descent (Realm 2).

## What it teaches
Learning-rate behaviour: slow crawl, healthy convergence, oscillation and
divergence, plus ill-conditioning (a narrow valley that makes the ball
zig-zag).

## Core loop
1. A side-view or top-down loss landscape is drawn. Mira, the original guide
   character, holds a lantern and appears as the "hiker" avatar at the start
   point.
2. The player sets the learning rate with a slider (log scale) and presses
   Step or Run. Each step applies `x = x - lr * grad(x)` exactly as in the
   lesson; no hidden physics.
3. A trail shows every iterate. The loss value and step count are displayed.
4. Win condition per level: reach the target loss within a step budget.

## Levels
1. 1-D parabola: find an lr that converges in 10 steps.
2. Same parabola, lr cap shown at 2/L: see divergence past it.
3. 2-D valley with curvatures 1 and 10: discover the zig-zag; unlock a
   momentum toggle.
4. Non-convex landscape with two basins: seed decides which basin you land in.
5. Boss: tune lr and momentum under a step budget on a random seeded
   landscape.

## Anime-style presentation (original art only)
Cel-shaded Loss Mountains backdrop, speed lines on overshoot, a sparkle
"power-up" burst on convergence, chibi reaction faces for Mira. Respect
reduced motion: swap bursts and speed lines for static icons and text.

## Accessibility
- Fully keyboard operable (arrow keys adjust lr, Enter steps).
- Non-game alternative: a table of iterates with the same slider, plus
  text feedback such as "diverging: lr is above 2/L".
- Colour-blind-safe trail colours with shape markers.

## Tech notes
- Implements `MiniGame` from `packages/games/src/types.ts`.
- Seeded RNG; game logic is a pure function `step(state, lr)` unit-tested
  independently of Phaser.
- One Phaser game instance at a time; created through a dynamic import and
  destroyed on unmount.

## Effects (Day 16)
- On a win: a 90 ms hit-stop, a 5% zoom punch, a ring around the hiker and radial focus lines for about 0.4 s, then the sparkle burst.
- On flying past the goal: a 60 ms hit-stop, a short camera shake and streaks behind the hiker.
- While the hiker glides, up to four fading afterimages trail behind it.
- Winning the boss level (5) also plays a short dark ink impact frame (never white, at most 2 a second) and a "BOSS DEFEATED" banner; picking the boss shows "BOSS BATTLE".
- The learner can choose Off, Low, Normal or High effects in Settings.
- Reduced motion or Focus mode: none of this runs; the hiker jumps between points as before.
- All of it comes from `packages/games/src/fx` (ADR 0012).
