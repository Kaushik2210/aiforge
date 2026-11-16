# ADR 0014: ASCII redesign with original effects

Status: accepted (Day 25)

## Context
The owner asked for the whole site to be redesigned around ASCII animation, using React Bits. React Bits is
licensed "MIT + Commons Clause" (checked in its `LICENSE.md` on 2026-11-16): components may be used inside an
application or website, but not sold, sublicensed or redistributed "alone, in a bundle, or as a ported version".
AIForge is an open-source repository, so committing copies of their component source would redistribute them.

## Decision
Build original effects in the same spirit and credit React Bits as inspiration, with no copied code.
- `lib/ascii-fx.ts`: pure functions of (size, time, seed): scramble text, code rain, skyline. Unit tested.
- `useMotionAllowed`: motion runs only when reduced motion, Focus mode and effects level Off are all clear.
- Decorative text is `aria-hidden`; real words stay in the page. Auto-moving art has a visible Pause button (WCAG 2.2.2).
- No WebGL; everything is text in a `<pre>`, so there is nothing to lazy-load.

## Slices
1. Day 25: engine, hero skyline, scramble headline, terminal header.
2. Next: quest cards, realm path and footer; typed boot line; decrypt-in headings; ASCII mini-games.
