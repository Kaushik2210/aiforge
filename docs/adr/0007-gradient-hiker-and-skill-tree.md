# ADR 0007: Gradient Hiker and the skill tree

Status: accepted, 2026-11-10

## Gradient Hiker

### Rules live outside Phaser
`packages/games/src/hiker/logic.ts` is pure TypeScript. Each step is the lesson's
rule with optional heavy-ball momentum:

    v' = momentum * v - lr * grad(x)        x' = x + v'

With momentum 0 this is exactly `x = x - lr * grad(x)`; nothing is hidden. A
`HikerSession` holds one play-through and announces changes; the Phaser scene,
the on-page sliders and the text table are three views of the same session.

### Levels, tuned by measurement
Constants were chosen by sweeping 80 learning rates (and 20 momentum values)
rather than by feel:
1. First steps: f(x) = x^2 from 10, goal loss under 0.5 in 10 steps. Plain
   gradient descent wins for lr 0.12 to 0.88 (the lesson's own numbers: x is
   multiplied by 1 - 2*lr each step).
2. The speed limit: curvature 5, so the stability limit 2/L is 0.4; wins well
   below it, diverges above it.
3. The narrow valley: curvatures 1 and 10. At budget 10 and target 0.5, **no**
   plain learning rate can win (tested over 200 values) but 152 of 1,520 momentum
   settings do, so the level teaches why momentum exists.
4. Two valleys: a deep and a shallow basin; the seed picks which side you start
   on. Any valley counts as a win; the deeper one scores higher.
5. Boss: a seeded random ravine, generated only if it is winnable with momentum
   (at least 12 settings) and not winnable without. Verified for 80 seeds.

### The stability limit is checked, not trusted
`maxStableLr = 2(1 + momentum) / largest curvature`. Tests run real simulations
just under (converges) and just over (diverges) that limit for every quadratic
level and four momentum values.

### Test quality
13 deliberately injected bugs (flipped momentum sign, ignored momentum, wrong
limit formula, boss that does not need momentum, no divergence check, and so on)
were run against the suite; the first run missed one (`<` vs `<=` at the goal
boundary), which is now covered. All 13 are caught.

### Accessibility
- Controls are real page elements: a log-scale learning-rate slider
  (0.005 to 2, arrow keys), a momentum slider, Step, Run, Reset, New landscape.
- The same game works as text: feedback in words (including the limit and the
  per-step factors) and a table of every step. "Text only" stops Phaser entirely.
- The canvas takes no input, so touch, wheel and keys keep working on the page.
- Trail markers cycle circle, triangle, square, so order never depends on colour.
- Reduced motion and Focus mode skip speed lines, sparkles and gliding.
- Winning pays XP once per level (`gradient-hiker:level-N`); nothing is locked.

## Skill tree
- `content/_skilltree.yml` lists 28 topics across 9 realms with *recommended*
  prerequisites. Prerequisites never lock anything.
- The schema rejects duplicate ids, unknown or self prerequisites, prerequisites
  from a later realm, repeated prerequisites and any cycle (reporting the path).
  `content:validate` also checks it against the real quests (every quest has a
  topic, same realm, its prerequisites are listed).
- Layout (`@aiforge/engine`): layer = 1 + deepest prerequisite, so every edge
  points right; rows are ordered by barycentre sweeps, tested not to increase
  crossings. Pure geometry, 15 tests.
- The page draws an SVG (mastery as a bar and as text) and repeats everything as
  a text list. Built quests are links; planned topics are dashed.

## Known limits
- The skill tree shows mastery only for built quests; planned topics read 0.
- The Phaser picture has no automated test (needs a canvas); it was verified by
  hand in dark and light, on a phone width, and through theme and text-only
  switches. Playwright arrives on Days 11 and 12.
- On a phone the diagram scrolls sideways inside its box; the list below is the
  easier way to read it.
- Level 4's start side and level 5's ravine change with "New landscape".
