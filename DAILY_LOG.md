# Daily log

## Day 1 (2026-11-09): scaffold and reference quest

**Shipped**
- Repo scaffold: pnpm workspace, licences (MIT code, CC BY-SA content), README, CONTRIBUTING, code of conduct, issue and PR templates, `/daily` command, project rules, plan.
- ADR 0001 (stack with versions read from npm today) and ADR 0002 (anime-inspired art direction, original assets only).
- `@aiforge/content-schema`: Zod schemas, quest validator, `content:validate` CLI, tests.
- Challenge CI (starter must fail, solution must pass) and a weekly freshness check.
- Reference quest "Gradient Descent" (Realm 2): five-tier lesson, 12 quiz items, 17 cards, 8 interview questions, 7 common mistakes, 5 sources, boss, 2 challenges, Gradient Hiker spec, `MiniGame` interface.
- `pnpm verify` green (typecheck, tests, content validation, challenge CI).

**Sources used** (fetched 2026-11-09): Ruder survey (arXiv 1609.04747), Adam (1412.6980), AdamW (1711.05101), Stanford CS231n optimization notes, d2l.ai gradient descent chapter. Notes in `research/02-math-ml-foundations.md`.

**Review**: independent reviewer found weak challenge tests (hard-coded and absolute-error mutants passed) and imprecise quiz wording. All fixed; both mutants now fail.

**Deviations**
- Brief said Phaser 4.1.0 is latest; registry and GitHub releases show 4.2.1.
- Mini-game, Pyodide runner and Next.js app are specs or placeholders only, as planned for later days.
- Lesson uses plain Markdown boxes until the MDX components exist (Day 2-3).

**TODO-VERIFY**
- Phaser 4 v3-to-v4 migration guide (read before Day 8).
- Goodfellow et al. ch. 4.3 (page did not load).
- Claim that saddles/plateaus are common in high dimensions (marked in lesson).
- Not in research notes yet: mini-batch size range 32 to 256, batch-size/lr interaction, warmup and decay schedules, gradient clipping, Adam "common for transformers", SGD+momentum in vision, Adam bias correction, PyTorch `Adam(weight_decay)` is L2 while `AdamW` is decoupled.
- Pin and compatibility-test TypeScript, Vitest and pnpm majors with Next.js on Day 2 (content-schema currently uses TypeScript 5.9 and Vitest 3).

**Tomorrow (Day 2)**: Next.js app shell, arcade-anime design system tokens (light and dark), first original guide character (Mira), lesson page layout.

## Day 2 (2026-11-09): app shell and design system

**Shipped**
- Next.js 16 app in `apps/web` with static export, Tailwind 4 and next/font (Dela Gothic One display, Nunito Sans body, JetBrains Mono code).
- "Midnight arcade academy" design tokens: semantic colours, spacing and type scales, light and dark themes, speed-line and XP-shine accents, reduced-motion and Focus mode (no animation, no speed lines).
- 32 automated WCAG contrast checks over every text and UI token pair in both themes (all pass).
- Mira, the first original guide character (SVG, three moods), XP/streak status bar, header with theme toggle and Focus mode, skip link.
- Home page and a quest page that reads the validated Gradient Descent frontmatter at build time (depth ladder, Core Fundamentals, Core Complexity, explain-it-back).
- Checked in the browser: dark and light themes, 375px mobile width, no horizontal overflow, no tap target under 44px, one h1 per page.
- CI now also builds the web app.

**Decisions**
- Kept TypeScript 5.9 and Vitest 3: the stack ADR listed newer majors; compatibility with Next.js was not tested, so deferred.
- Raw tokens are `--c-*` and mapped to Tailwind via `@theme inline` (same-name mapping is circular).
- The UI skill's search script was not installed, so the palette and font pairing were chosen by hand following its rules.

**TODO-VERIFY / not done**
- Lesson body, quiz and editor are not rendered yet (MDX components Day 3, runner Days 4-5).
- Status bar shows preview values, not real progress.
- No automated axe/Playwright run yet (planned Days 11-12); manual checks only so far.
- Font choices rely on Google Fonts at build time.

**Tomorrow (Day 3)**: MDX pipeline and components (Callout, CoreFundamentals, CoreComplexity, Quiz, Step, Math/KaTeX, Diagram), render the full Gradient Descent lesson.

## Day 3 (2026-11-09): lesson rendering and home redesign

**Shipped**
- MDX pipeline (`@mdx-js/mdx`, remark-gfm, remark-math, rehype-katex, rehype-slug) rendering the full Gradient Descent lesson with KaTeX.
- Lesson components: interactive learning-rate demo (tested logic in `lib/gd.ts` reproduces the worked numbers), Callout (text label, never colour alone), "Check yourself" Step, Diagram, and a Quiz that explains why each wrong option is wrong (all 12 items render).
- `readQuiz` helper in content-schema; quest page renders lesson plus quiz.
- Home page redesign from established gamified-learning patterns: layered anime skyline hero with Mira, bento grid, winding 23-realm quest map (open vs coming soon; nothing is progress-locked), rank ladder. Scroll reveal and falling petals respect reduced motion and Focus mode.
- Contrast tests extended to 43 passing checks.

**Decisions**
- The Awwwards UI listing gave only site names and URLs (no descriptions), so no specific site was imitated; patterns were chosen from common gamified-learning UI (path map, bento, rank ladder, boss bar). If you have favourites from that list, tell me which and I will study them.
- Copy on the home page marks unbuilt features (in-browser Python, streaks, bosses) as coming or planned, and sample widgets as "Example".
- Next.js writes `apps/web/AGENTS.md` on dev start; it is git-ignored.

**TODO-VERIFY / not done**
- Quest map has no real progress yet; the sample streak and boss widgets are static.
- No axe/Playwright run yet (Days 11-12); checked by hand in light, dark and 375px.
- Lesson code blocks have no syntax highlighting.

**Tomorrow (Day 4)**: Pyodide Web Worker runner, test harness with timeout and kill, Monaco editor, run the two Gradient Descent challenges in the browser.

## Day 4 (2026-11-09): in-browser Python runner

**Shipped**
- `@aiforge/runner`: one Python harness that runs each challenge's own `tests.py` exactly as the CLI challenge CI does, an output parser, and `PyRunner` (module Web Worker, hard `terminate()` on timeout, fresh worker on the next run).
- Parity test against real Pyodide (in Node): every starter fails and every solution passes through the same harness the browser uses, plus syntax-error, wrong-answer and no-state-leak cases.
- Pyodide is self-hosted: `scripts/sync-runner-assets.mjs` copies the runtime and worker into `apps/web/public` before dev/build (git-ignored, works offline after first load).
- Challenge metadata (`challenge.yml`), `readChallenges`, validation that each challenge has starter, solution, tests, exactly 3 hints and metadata. Solutions are never sent to the browser.
- UI: lazy Monaco editor with a plain-textarea fallback (default on phones and touch, toggle for screen-reader users), Challenge panel with Run, Reset, progressive hints, per-test results, draft saved in localStorage.
- Checked in the browser: starter fails 9/9 with helpful messages; correct solution passes 9/9 in about 0.5 s (first load about 2.5 s); `while True` is killed at 10 s and the page stays responsive; a syntax error shows `SyntaxError: expected ':'`; the next run after a kill recovers.

**Decisions**
- Module worker, because this Pyodide release ships `pyodide.asm.mjs` (ES module).
- `allowBuilds` replaces `onlyBuiltDependencies` for pnpm 12 (installs no longer exit non-zero).
- Monaco's loader fetches editor files from a CDN; self-hosting Monaco is deferred. The plain editor works fully offline.

**TODO-VERIFY / not done**
- All tests are visible; hidden tests are not implemented yet.
- Challenge pass/fail does not award XP or save progress yet (engine, Days 6-7).
- Memory limits are not enforced in the worker (only a time limit).
- No automated browser test of the worker timeout; verified by hand today (Playwright arrives Days 11-12).
- `base path` for GitHub Pages hosting is not configured: worker and Pyodide URLs are root-relative.
- Pyodide itself is about 13 MB on first run.

**Tomorrow (Day 5)**: challenge CI hardening (run in Pyodide too), hidden tests, memory/output limits, and polish of the runner experience.

## Day 5 (2026-11-09): runner hardening and challenge quality gate

**Shipped**
- Hidden checks (`hidden_tests.py`): run in the same harness, reported as counts only (no names or messages), required for an overall pass.
- Mutation-style challenge CI: every challenge needs 2+ `mutants/` (plausible wrong solutions); CI requires starter fails, solution passes visible and hidden, and every mutant is rejected. Same rules run through real Pyodide (33 runner tests). Real finding: the `ignores_h` mutant passes all visible tests and is caught only by a hidden check.
- Harness guard rails: output capped (about 8 KB head, last 30 lines, PASS/FAIL always kept), stdin closed so `input()` raises EOFError, a crashed hidden file counts as a failure.
- `PyRunner`: Stop (`cancel`), crash recovery (worker `error` event replaces the worker).
- UI: Stop button, Ctrl/Cmd+Enter to run, hidden-check summary, collapsible program output, run time.
- ADR 0003 documents the runner design and its limits honestly.
- Checked in the browser: hidden check rejects the visible-passing mutant, Stop works, a 10**10 allocation fails cleanly and the next run recovers, a 100000-line print flood still lets a correct solution pass.

**Decisions**
- Hidden checks are not a security boundary: they ship to the browser (static, local-first site). They stop answers that only fit the examples; do not use them for private assessment.
- WebAssembly memory is not capped; a large allocation fails with an error but is not limited up front.

**TODO-VERIFY / not done**
- No automated browser (Playwright) test of Stop/timeout yet; verified by hand (Days 11-12).
- Pass/fail still awards no XP and is not stored (engine Days 6-7).
- Content rule applies to every future challenge; Realm 1 challenges will need hidden checks and mutants.

**Tomorrow (Day 6)**: engine package: XP and levels, rank ladder, streak engine (freezes, timezones, DST) with heavy tests.

## Day 6 (2026-11-09): engine, part 1 (XP, ranks, streaks)

**Shipped**
- `@aiforge/engine` (pure TypeScript, no dependencies): timezone-safe calendar-day primitives, XP curve and rank ladder, per-event XP awards, and the streak engine (freezes, comeback bonus, status, strict import validation, merge).
- Streak design: store the exact last-activity instant and recompute its local day in the learner's current zone, so travel and DST cannot add or lose a day; day gaps are calendar arithmetic, never 24-hour blocks.
- 94 tests: day arithmetic and real DST day lengths (23 h and 25 h), midnight edges (including half-hour and 45-minute zones), freeze earning/cap/all-or-nothing, travel east/west and across the date line, clock going backwards, import and merge, and a full year of daily activity in 11 zones (no false breaks).
- 300 randomised histories compared with an independent day-by-day oracle, with invariants checked at every step.
- Mutation check: 10 deliberately injected streak bugs (24-hour arithmetic, stale stored zone, freeze misuse, cap off by one, double counting, and more) were all caught; none survived.
- ADR 0004 records the rules.

**Decisions**
- Frozen days protect the run but are not counted as practice or shown on the heatmap.
- Freezes are spent only when they cover the whole gap; otherwise none are spent.
- Comeback bonus is a flat 25 XP when a streak breaks (never on the first activity).
- Rank thresholds are by level (1, 5, 10, 20, 35, 50, 75) and are tunable constants.

**TODO-VERIFY / not done**
- Rank thresholds and XP values are first drafts; tune once real lessons exist.
- The engine is not wired into the UI yet (needs Dexie persistence, Day 7).
- Mutation script lives only in the session scratch area (Windows/pnpm-specific); not added to the repo.
- Streak "day counted" rule (step or 5-card review) is enforced by callers, not the engine.

**Tomorrow (Day 7)**: spaced repetition scheduler (FSRS-style), mastery calculation, Dexie persistence with versioned schema and JSON export/import, and wiring XP and streak into the status bar.

## Day 7 (2026-11-09): spaced repetition, mastery and saved progress

**Shipped**
- Engine: SM-2 spaced repetition (verified against the original description) with an interleaved, seeded review queue; mastery (quiz 25%, retention 35%, boss 40%); a pure progress snapshot with an event reducer (steps, quizzes, challenges, bosses, cards, games), strict import/export validation, migration runner, and merge.
- Web: IndexedDB persistence with Dexie (single atomic snapshot row, backups, corrupt-data recovery, newer-version protection), a Zustand store with cross-tab sync, and in-memory fallback if storage is blocked.
- UI: live header HUD (level, rank, XP bar, streak status), XP/level-up toasts, "Mark tier done" depth ladder, topic mastery panel, quiz answers and challenge runs recorded, and a Settings page to export, import (merge or replace) and reset.
- Tests: engine 180 (46 new for progress, 24 SRS, 16 mastery), web 62 (15 persistence tests using fake-indexeddb: reload, 25 concurrent events, two connections, corruption, newer version, import/export, backups).
- Checked in the browser: tier done gives +10 XP and a 1-day streak, a correct quiz answer +5, a first challenge pass +40; data survives reload; garbage and tampered files rejected with clear messages and no change; merge works; reset keeps a backup; mobile header compacted (222 px to 181 px), no overflow, all targets at least 44 px.
- ADR 0005 records storage, SRS and mastery decisions.

**Decisions**
- SM-2 now, FSRS later (its constants are version-dependent and were not verifiable this session).
- Streak activity: tier step, challenge pass, or 5+ card review; quiz answers alone do not count.
- XP merges as the larger total (ledgers cannot be reconciled across devices).

**TODO-VERIFY / not done**
- Flashcards are not enrolled or reviewable yet: the Review Tavern and Daily Quest come on Day 10, so retention shows 0%.
- Bosses are not playable yet, so the boss share of mastery stays 0.
- Tier "done" is a self-report button; there is no check that the tier was read.
- FSRS constants and the SM-2 interval-uses-updated-EF choice are documented but not verified against another implementation.
- No Playwright test of persistence yet; verified by hand and with fake-indexeddb.

**Tomorrow (Day 8)**: Phaser 4 integration (dynamic import, lifecycle, typed event bus, seeded RNG) and the world map scene with a list-view fallback.

## Day 8 (2026-11-10): Phaser 4 integration and the world map

**Shipped**
- Read Phaser's own v3-to-v4 migration guide and type definitions from the installed `phaser@4.2.1` (resolves the Day 1 TODO-VERIFY); notes in `research/08-phaser-4.md`. ES build has named exports, so `await import("phaser")` works.
- `@aiforge/games`: `GameHost` (lazy start, one game at a time, safe teardown), `TypedEmitter` event bus, seeded `Rng`, 23 original biomes, pure map layout (nodes, bands, scenery, spline path, camera fit), the Phaser `WorldMapScene`, and a factory that loads Phaser on demand.
- Web: `/map` page with a Map/List toggle (list is the accessible fallback and the phone default), keyboard control, a details panel with a live region, header link.
- Tests: 58 in the games package (lifecycle races, layout invariants, RNG, event bus, colours, spline). Browser-verified: dark and light rendering, click, drag, keyboard, teardown, production bundle sizes.
- Real bugs found by running it: light theme crashed on CSS-minified `#fff`; scenery could land half a pixel inside its clearance zone; yellow text and a cream focus ring were unreadable in light mode; the old canvas lingered a frame after a restart (now removed immediately).
- ADR 0006 records the design.

**Measured (production build)**: home page 8 scripts, 577 KB, no Phaser; `/map` fetches the 1.3 MB Phaser chunk only when the map is shown.

**Decisions**
- Own tiny seeded RNG instead of Phaser's, so game logic stays pure and version-independent.
- Phaser keyboard off; keys are forwarded from a real focusable element.
- Fog over unbuilt realms is cosmetic; nothing is locked (gamification never blocks learning).

**TODO-VERIFY / not done**
- Map text is tiny on phones (min zoom 0.4); UI offers the list. A narrow-screen layout is future work.
- Realm progress (completed/mastery ring on nodes) is not drawn yet; needs wiring to the progress store.
- Skill-tree view (topic prerequisites graph) is not built; scheduled with Gradient Hiker on Day 9.
- No Playwright test of the canvas yet (Days 11-12).
- Device pixel ratio / crispness on high-DPI screens was not checked.

**Tomorrow (Day 9)**: skill-tree view and the Gradient Hiker mini-game (pure `step(state, lr)` logic with tests, Phaser scene, accessible non-game alternative).
