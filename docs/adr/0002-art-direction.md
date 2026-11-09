# ADR 0002: Anime-inspired arcade art direction

Status: accepted, 2026-11-09

## Context
The owner wants anime-style gamified learning. The original brief asked for an
"arcade cyber-lab" look with pixel accents.

## Decision
Blend the two: a bright, expressive anime-inspired style (cel-shaded
illustrations, speed lines, sparkle effects, expressive guide characters,
chibi reaction faces, dramatic "power-up" level-ups) on top of the dark/light
arcade UI. Each realm gets an original biome and an original guide character.
Boss fights and streak milestones use anime-style cut-ins.

## Constraints
- All characters, mascots, sprites, backgrounds and music are original work.
  No assets, names or likenesses from existing anime or games.
- Illustrations are SVG or sprite sheets we own or that carry a compatible
  licence recorded in `docs/assets.md`.
- Every effect has a reduced-motion alternative; focus mode disables
  particles, speed lines and sound.
- Colour-blind-safe palettes; text contrast meets WCAG AA over illustrations.
- Characters support learning (hints, encouragement) and never shame a
  learner for missing a day.

## Consequences
Art production becomes a recurring task per realm. Day 2-3 defines the shared
palette, type scale and a first original guide character.
