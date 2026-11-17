# ADR 0015: New theme, a 3D loss landscape driven by scroll

Status: accepted (Day 27)

## Context
The owner did not like the animated mascot, the scrambling and typed text, or the heavy display font, and asked for
a different theme using GSAP and three.js. This replaces the ASCII-first look of ADR 0014 as the default; ASCII mode
(ADR 0013) stays as an opt-in toggle, and the text-art views only show in it.

## Decision
- Idea: the home page hero is a real loss landscape (two valleys) drawn with three.js. A ball runs plain gradient
  descent on it, and scrolling drives the descent through GSAP ScrollTrigger. It shows the first thing Quest 1 teaches.
- The maths is pure and tested (`lib/landscape.ts`); the scene only draws those numbers.
- Palette and type: new semantic tokens (ink navy, mint "signal", sky, amber; light theme paper and deep teal), all
  contrast-tested in both themes. Space Grotesk for headings, Inter for text, JetBrains Mono for code.
- Removed: the mascot, scramble and typed text, the caret, the ASCII hero, the speed lines and petals.

## Licences
- three.js is MIT.
- GSAP is under Webflow's Standard "No Charge" licence (checked at gsap.com/standard-license, effective 2025-04-30, last
  modified 2025-05-30): free for websites including commercial ones; forbidden only in tools that compete with Webflow's
  visual animation builder. It is not open source, so it is installed from npm and never copied into this repo.

## Accessibility and performance guardrails
- Decorative: the canvas is aria-hidden; the page says in text what it shows.
- Reduced motion, Focus mode and effects Off give one still picture of the finished run with no scroll effects, and GSAP
  is not even loaded.
- One WebGL context at most; it is released on unmount. If WebGL is missing the page shows a still gradient poster.
- three.js and GSAP are loaded with dynamic import, only on the home page, after the first paint.
- The scene draws on demand (scroll, pointer, resize), never in a continuous loop.
- Text motion is movement only (no opacity fades) so contrast never drops while it plays.

## Not done
- The other pages have the new colours and type but no 3D; the dashboard and quest cards could use GSAP reveals.
- No check on a real phone GPU; the pixel ratio is capped at 2.
