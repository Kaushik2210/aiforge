---
verifiedOn: 2026-11-16
topic: React Bits, ASCII mode and terminal-style games for AIForge UI
---

# Research notes: React Bits and an ASCII look

Fetched 2026-11-16, paraphrased. Items not confirmed are `TODO-VERIFY`.

## Sources (all fetched 2026-11-16)
1. https://raw.githubusercontent.com/DavidHDev/react-bits/main/LICENSE.md
2. https://github.com/DavidHDev/react-bits (README) and https://reactbits.dev/get-started/introduction (no FAQ section exists)
3. Component sources: `src/ts-tailwind/{TextAnimations,Backgrounds,Components}/<Name>/<Name>.tsx` on main, 23 files read (grep of imports, `getContext`, `prefers-reduced-motion`)
4. https://raw.githubusercontent.com/DavidHDev/react-bits/main/package.json (the site's own deps, not the components')
5. https://gsap.com/community/standard-license/
6. https://raw.githubusercontent.com/motiondivision/motion/main/LICENSE.md (MIT)
7. https://raw.githubusercontent.com/ondras/rot.js/master/license.txt (BSD-3-Clause terms)
8. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
9. https://raw.githubusercontent.com/google/fonts/main/ofl/vt323/OFL.txt and https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/OFL.txt (both SIL OFL 1.1)
Not fetched: ogl and three licences (MIT from memory, TODO-VERIFY; not needed because see below), rot.js npm page (403; version and gzip size TODO-VERIFY), Press Start 2P licence (OFL from memory, TODO-VERIFY).

## 1. React Bits
**Licence: MIT + Commons Clause**, copyright 2026 David Haz. Use in apps, sites and commercial products is allowed. You may not sell, sublicense or redistribute the components themselves, alone, bundled or as a port. Tools and sounds carry the same restriction; exports of tools can be used in any product but not resold as packs.

**Verdict for AIForge:** using React Bits inside a private site is fine, but our repo is a public MIT project. Committing copied component source means we redistribute them under MIT, which the Commons Clause does not allow, and Commons Clause is not an open-source licence (OSI). So: **do not commit copied React Bits source.** Use it only as visual reference and write our own implementations (ideas and effects are not covered; their code is). Re-check before any exception. TODO-VERIFY with a lawyer if the owner still wants to copy; the safe route is also the cheapest to defend.

**Install:** copy-paste from the Code tab, shadcn CLI (`npx shadcn@latest add @react-bits/SplitText-TS-TW`) or jsrepo. README does not mention npm. Four flavours: JS/TS x CSS/Tailwind.

**Dependencies (current main, checked in source):**
- Most backgrounds and effects now use raw WebGL2 or Canvas 2D with no library: ASCIIText, Aurora, Beams, Dither, Particles, DotGrid, FaultyTerminal, GradientASCII, LetterGlitch, GlassSurface (WebGL or 2D probe).
- No dependency: ShinyText, GlitchText, SpotlightCard, TechText, PillNav (plain React).
- `motion` (MIT): DecryptedText, CountUp. `react-dom`: Dock.
- `gsap` (+ ScrambleTextPlugin, SplitText, ScrollTrigger): ScrambledText, ScrollReveal, TextType, StaggeredMenu.
- `@hugeicons/*`: MagicBento.
- The site's package.json also lists three, @react-bits fibre/drei, ogl, matter-js, lenis; older or heavier components (model viewers, 3D cards) probably use them, not checked, TODO-VERIFY.
- **GSAP licence:** free for everyone including commercial and the former members-only plugins, under Webflow's standard licence, not an open-source licence (Webflow owns IP, can revise terms, forbids use in tools competing with Webflow's builder). Using it as an npm dependency is workable, but the ADR 0012 position (avoid GSAP) still stands. motion is MIT.

**WebGL cost:** 10 of the 23 read create a WebGL2 context (rAF shader loops, fullscreen canvases). On low-end phones that means GPU drain and a second context next to Phaser's; use one at most per page, lazy-loaded, never on lesson pages.

**Reduced motion:** 21 of 23 read `matchMedia('(prefers-reduced-motion: reduce)')` (read once in an effect; ScrollReveal uses gsap matchMedia). **StaggeredMenu and GlassSurface have no check.** None reads our Focus mode, so any copy would need wrapping anyway. The check is a one-off read, not a live listener in the ones inspected (TextType listens; others TODO-VERIFY).

**React 19 / Next 16 / static export:** components start with `'use client'`, no server APIs, so static export works; canvases must mount in effects (they do). Compatibility with React 19.3 / Next 16.4 not run, TODO-VERIFY.

## 2. Shortlist (own implementation preferred for all)
Names exist in the repo: ASCIIText, GradientASCII, FaultyTerminal, LetterGlitch, TechText, DecryptedText, ScrambledText, ScrollReveal, ShinyText, CountUp, GlitchText, TextType, Dither, Beams, Aurora, Particles, DotGrid, SpotlightCard, Dock, PillNav, StaggeredMenu, MagicBento.

| Idea | React Bits original | Deps | WebGL | Reduced motion | Own build |
|---|---|---|---|---|---|
| Decrypt / scramble headings | DecryptedText (motion), ScrambledText (gsap) | motion / gsap | no | yes | ~40 lines React + rAF, swap glyphs from a fixed set, final text always in DOM |
| Typewriter | TextType (gsap) | gsap | no | yes | CSS `steps()` + `ch` width, or 25 lines JS |
| Count up | CountUp (motion) | motion | no | yes | 20 lines rAF, `Intl.NumberFormat` |
| Shiny text | ShinyText | none | no | yes | pure CSS gradient clip + animation |
| Spotlight card | SpotlightCard | none | no | yes | CSS radial-gradient on `--x/--y` pointer vars |
| Glitch text | GlitchText | none | no | yes | avoid (2.3.1 risk, ADR 0012); static offset instead |
| Dot grid / ASCII background | DotGrid, LetterGlitch, GradientASCII, ASCIIText | none | yes | yes | one 2D canvas of glyphs, 20 fps cap, paused offscreen; ~120 lines |
| Aurora / Dither / Beams / Particles | same | none | yes | yes | skip or a CSS gradient; WebGL cost not worth it |
| Dock / PillNav | Dock, PillNav | none | no | yes | CSS grid + `:focus-visible`; motion only if needed |
| Staggered menu | StaggeredMenu (gsap) | gsap | no | **no** | CSS transitions |
Bundle: component sizes themselves are 10-60 kB source, 3-15 kB minified each plus gsap (~tens of kB, TODO-VERIFY) if used. Own versions should be under 2 kB each.

## 3. ASCII / terminal-style games
**Options:** rot.js (BSD-3-Clause terms, Ondrej Zara; display, FOV, pathfinding, map generation; TODO-VERIFY version and size). A DOM `<pre>` grid (accessible, selectable, easy to test, fine to ~80x30 cells). A canvas grid with `fillText` (fast for 100x40 if glyphs are cached to an offscreen atlas). We can write the renderer ourselves in about 100 lines and keep the ASCII-art game logic pure (like the FX kit), so no engine is needed; rot.js is optional for FOV and A* if a roguelike grows. Typewriter feel: CSS `steps()`, but it is auto-moving content, so keep it short (under 5 s) or add a pause.

**Fonts (OFL 1.1, free to bundle, self-host and subset woff2):** JetBrains Mono (copyright 2020 JetBrains Mono Project Authors), VT323 (2011 VT323 Project Authors, pixel look, small), Press Start 2P (TODO-VERIFY). Self-host to stay local-first; one weight, Latin subset, `font-display: swap`; about 15-40 kB. Box-drawing glyphs vary by font; test them.

**Three game-feel ideas**
1. **Loss Mountains (roguelike).** A glyph terrain where height digits (`0-9`, `.:-=+*#%@`) show loss. The player moves one cell per key; the learning rate is step size, momentum is an inertia glyph trail. Pure function `step(grid, pos, lr)` is unit-tested; renderer is a `<pre>`. Teaches: gradient descent, local minima, learning rate overshoot. Win cell is `V`, local minima `v`, hazard `X` (shapes, not colour).
2. **Spell terminal.** A two-pane terminal: prompt on the left, a dungeon room on the right. Typing a Python snippet in the existing Pyodide runner casts it (`len(tokens)` damages an enemy ghoul). Enemy test failures are `[F]` glyphs; passing tests clear them. Reuses the challenge engine and its must-fail-starter rule.
3. **BPE sorter.** A conveyor of characters `t h e _ c a t`; learners merge the most frequent pair with Enter/Space, the grid redraws with merged tokens boxed `[th]`. Teaches byte-pair encoding. Frequency table is real text next to the art.

**Accessibility for all three:** the visible grid is `aria-hidden`; a visually hidden live region (polite, rate-limited) says "Moved east, loss 3.1, lower than before", plus a "describe map" button that prints the grid as rows with coordinates. Every action is on keys (arrows, WASD, Enter, Esc) and on 44px on-screen buttons; no timer-driven danger, turns not real time. No flashing; motion only on turn changes, off under reduced motion or Focus mode. Meaning comes from glyph shape, not colour. Contrast 4.5:1 for text glyphs, 3:1 for decorative ones. Load: lazy `next/dynamic`, no Phaser needed, about 5-10 kB code plus font.

## 4. Guardrails
- **2.2.2 (A):** content that starts automatically, lasts over 5 s and sits next to other content needs pause/stop/hide; auto-updating content needs it with no 5 s grace. Triggers via hover, focus or scroll-into-view count as automatic. Essential game activity is exempt, but a background ASCII animation is not essential: give a visible Pause/Motion off control and stop by default under reduced motion.
- **2.3.1 (A):** at most 3 flashes per second; reuse `FlashLimiter` and keep glitch/scramble to slow swaps (ADR 0012 reached the same rule).
- ASCII art is `aria-hidden="true"` with a real text sibling (or `role="img"` plus `aria-label` for one-off logos); never put real content only in glyphs. Selectable text in `<pre>` can be read letter by letter by a screen reader, so hide decorative art.
- Contrast: decorative glyphs on a background should be low-contrast but any meaningful glyph 4.5:1 (text) / 3:1 (graphics) in both themes; test the ASCII layer against both tokens.
- No layout shift: fixed `ch` and line-height boxes, reserve height, scramble effects keep the final string width (monospace helps).
- 44px minimum touch targets, visible focus, pause on `visibilitychange`.

## 5. Recommendation: ranked UI upgrades (impact per effort)
| # | Upgrade | Build | Licence verdict |
|---|---|---|---|
| 1 | **ASCII mode toggle** (global, see below) | own | clean, ours |
| 2 | Terminal-style section headers and a typed "boot line" (`> quest 07 loaded`) | own, CSS `steps()` | clean |
| 3 | Spotlight/tilt-light cards for quest tiles | own, CSS vars | clean (idea only) |
| 4 | Count-up XP / streak numbers, shiny rank text | own, rAF + CSS | clean |
| 5 | Decrypt-in headings on quest open (short, once) | own, 40 lines | clean |
| 6 | Glyph background (DotGrid-like) on home hero only, pause button | own canvas | clean |
| 7 | Dock-style bottom nav on mobile | own, CSS | clean |
| 8 | Scroll reveal for lesson sections (IntersectionObserver, CSS) | own | clean |
Copy-and-paste from React Bits: **none**, because of the Commons Clause. If the owner insists, only dependency-free pieces and with a TODO-VERIFY legal check. GSAP-based ones are out.

**ASCII mode proposal:** a header toggle sets `data-ascii="on"` on `<html>` (persisted in Dexie/localStorage, default off, off in Focus mode and respects reduced motion for the typing effect). CSS only: `--font-display` switches to the mono font, headings get `> ` prefixes via `::before`, cards get `border: 1px dashed` and `+--+` corner glyphs via `::before/::after` (generated content, so not read twice if `content` carries `/ ""` alt text; TODO-VERIFY browser support of alt text syntax), buttons become `[ Start ]`, progress bars become `[#####-----]` via a CSS-only or text component with `role="progressbar"`. Light and dark both work because only tokens and fonts change. No JS animation required.

**One-day slice:** (1) add `AsciiModeToggle` + `data-ascii` tokens and mono font self-hosted (JetBrains Mono subset); (2) CSS rules for headings, cards, buttons; (3) `AsciiProgress` text bar with aria; (4) Playwright + axe check in both themes and both modes, reduced motion test, bundle size note; (5) record the decision in a new ADR and a `docs/assets.md` font entry. Stop there; games come later.
