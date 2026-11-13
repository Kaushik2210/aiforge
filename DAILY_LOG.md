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

**- Added keyboard tests (skip link, visible focus, no trap) and reduced-motion and Focus-mode tests (no infinite animations; home has 13 without them).
- The flow tests found a real hydration error on the dashboard (React #418): the heatmap and XP chart rendered dates at build time. They now wait for loaded data like the Today panel.
- Vitest is limited to `src/` so it ignores the Playwright specs.

TODO-VERIFY / not done
- Every page requests `__next.<route>.__PAGE__.txt` prefetch files that 404 on my static server (the export has them in a folder). Harmless prefetches, but check how the real host serves them.**
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

## Day 9 (2026-11-10): Gradient Hiker and the skill tree

**Shipped**
- Gradient Hiker, all five levels, per `packages/games/gradient-hiker/SPEC.md`: pure logic (the lesson's update rule plus optional momentum), a session object, drawing maths, a Phaser scene in the cel-shaded anime style (original lantern-bearer hiker, shape-coded numbered trail, goal zone, speed lines and sparkles that respect reduced motion), a `MiniGame` wrapper, and the `/games/gradient-hiker` page with a log-scale learning-rate slider, momentum slider, live feedback, a table of every step and a text-only mode. First wins award XP; levels show "(cleared)".
- Levels tuned by measurement, not feel: level 3 cannot be won by any plain learning rate but 152 of 1,520 momentum settings win it; the boss ravine is generated only if momentum-winnable and not plain-winnable (80 seeds checked).
- Stability limit 2(1+momentum)/curvature verified against real simulations just under and over the limit.
- Skill tree: `content/_skilltree.yml` (28 topics, 9 realms), schema with cycle, unknown-prerequisite and later-realm checks, a consistency check against real quests wired into `content:validate`, a tested left-to-right layout in the engine (barycentre crossing reduction), and the `/skills` page (SVG with mastery bars, hover and focus highlighting, plus an equivalent text list).
- Tests: games 128 (51 new for the Hiker), engine 195 (15 new), content-schema 28 (15 new), web 67 (5 new).
- Mutation check on the Hiker logic: 13 injected bugs; the first run missed one (`<` vs `<=` at the goal), fixed, now all caught.
- ADR 0007 records the design.

**Real bugs found by running it**
- The Hiker's canvas never appeared: the mount effect ran before its container existed and never re-ran, with no error. Found in the browser; fixed by waiting for the game to be ready.
- Switching to text-only hid the canvas but left Phaser running; added `unmount()`.
- A type-name clash and a test-arithmetic slip were caught by typecheck and tests.
- A batched shell command failed to parse and created nothing; redone with the file tool.

**Decisions**
- Hiker rules live in a pure session; Phaser only draws. The canvas takes no input so the page keeps scrolling and keyboard behaviour.
- Skill-tree prerequisites are a recommended order, never a lock.
- Level 4 counts any valley as a win and scores the deeper one higher (keeps it always solvable).

**TODO-VERIFY / not done**
- Skill-tree topics beyond Gradient Descent are planned, not built; their prerequisites are my judgment of a sensible order and should be reviewed as each quest is written.
- The Phaser picture has no automated test; checked by hand (dark, light, 375px, theme and text-only switches). Playwright is Days 11-12.
- The map nodes still do not show progress, and the Hiker's `game-result` XP uses one id per level.
- Not checked: crispness on high-DPI screens; the dev build animates slowly in the preview pane.
- Skill-tree mastery covers built quests only.

**Tomorrow (Day 10)**: dashboard (heatmap calendar, XP over time, mastery radar), Daily Quest generator, and the Review Tavern (flashcards through the SM-2 queue).

## Day 10 (2026-11-10): dashboard, Daily Quest and Review Tavern

**Shipped**
- Review Tavern (`/review`): flashcards through the SM-2 queue with interleaved topics, keyboard sittings (1 to 4), the real next-review interval on each button, "Again" retried once with only the first rating counting, a 10-new-cards-per-sitting cap, early "Practice 5 cards" top-up, and a summary (cards, XP, streak, next due). A quest's flashcards join your deck when you finish its first tier.
- Daily Quest: three goals a day (step, 5-card review set, build or play), chosen deterministically from the date, completion read from the XP ledger, and a once-a-day +25 XP claim; shown on the home page and the dashboard.
- Dashboard (`/dashboard`): today's quest and streak, a 26-week practice calendar, 30-day XP chart, mastery radar by realm with "worth a visit next", all as hand-built SVG with text or table equivalents.
- Engine: `activity` (daily XP, heatmap, XP series), `dailyquest`, `reviewsession`, an extra-practice option in the queue, a `daily-quest-claim` progress event. Content: `readCards`.
- Tests: engine 246 (+51), web 80 (+13), content-schema 29 (+1).
- Checked in a real browser: auto-enrolment of 17 cards, a full keyboard sitting (10 cards, 20 XP), quest goals flipping to 3 of 3 after winning a Hiker level, the +25 claim (once; persists after reload), phone width on dashboard and review, every radar label inside its chart.
- ADR 0008 records the rules and limits.

**Bugs found by testing and by running it**
- `xpSeries` reported a trimmed ledger as complete (reversed date arguments). A test caught it.
- The Tavern said "Review 17 cards" but the sitting held 10 (the new-card cap); the label now shows the real size and explains the cap.
- The XP chart's fixed width pushed the dashboard grid past the screen and the radar's labels were clipped; both are responsive now and every label was verified inside the SVG.
- The game goal named a specific level but any win counted; the text now says so.
- A typing error and a shell command that failed to parse earlier in the week were fixed (no lasting effect).

**Decisions**
- Completion is derived from what you did, not from the plan; claiming is idempotent through the ledger, so no schema change was needed.
- Only the first rating counts for scheduling, so a lapse is never erased by a lucky retry.
- Early practice is allowed so the review goal and streak are always reachable.

**TODO-VERIFY / not done**
- The XP chart and calendar intensity only reach back as far as the ledger (latest 300 awards); older days show as present but not weighted, and the chart says so.
- No boss component in mastery yet (bosses are not playable); retention is a heuristic.
- The first-interval buttons all read "1 day" for a brand-new card, which is what SM-2 does; a friendlier preview may be worth designing.
- No Playwright test yet; the Tavern, quest claim and charts were verified by hand and with engine tests (Days 11 and 12).
- The quest catalog is read at build time.

**Tomorrow (Day 11)**: accessibility pass (keyboard, focus order, headings, landmarks), reduced-motion and Focus-mode audit, and Playwright with axe in CI.

## Day 11: Accessibility checks in a real browser

Done
- Playwright and axe-core run against the static export (`pnpm --filter @aiforge/web test:e2e`): every page in light and dark, WCAG 2.2 AA tags, plus one h1, one main landmark and a skip link per page. Runs in CI after the build.
- Fixed what it found: Monaco comment colour under AA contrast (custom light and dark themes), a second h1 on quest pages (lesson "# Title" now renders as h2), and skill-tree link names that did not match their visible text.

TODO-VERIFY / not done
- Keyboard-path tests cover the skip link and visible focus on every page; flow tests cover a tier, a Tavern sitting by keyboard, the map list view, and dashboard/settings without page errors. A game win by keyboard and the full Daily Quest (step, review set, level win, one claim) are covered too.
- axe covers roughly a third of WCAG issues; a manual screen-reader pass is still owed.
- The Phaser canvas is not covered by axe.
- CI e2e job has not run on GitHub yet (local run used installed Chrome).

Tomorrow
- Deploy pipeline and README polish (Day 12).

## Day 12: Deploy path and docs

Done
- The site works under a base path (`NEXT_PUBLIC_BASE_PATH`, default empty): `withBase` helper with tests, applied to plain anchors, MDX lesson links and the Python worker URLs. Checked by hand under `/aiforge/` in Chrome: Pyodide runs the starter (0 of 9 pass), no failed requests, no unprefixed links.
- Manual `deploy` workflow for GitHub Pages (ADR 0009). It has never run.
- README and CONTRIBUTING updated: real status, how to run browser tests, deploying, the `withBase` rule.
- The e2e static server can serve under a base path (`node e2e/serve.mjs <port> /aiforge`).

TODO-VERIFY / not done
- Pages is not enabled and the repository is private; the deploy workflow is untested on GitHub.
- The Playwright suite does not run under a base path in CI.
- The CI e2e job from Day 11 has still not run on GitHub.
- Prefetch `__next.*.txt` 404s, Monaco CDN, Phaser canvas coverage and a manual screen-reader pass remain open.

Tomorrow
- Day 13: minitorch v1 (tensor and autograd for teaching).

## Day 13: minitorch v1

Done
- `packages/minitorch`: n-d `Tensor` with broadcasting and reverse-mode autograd (iterative backward, accumulating gradients), elementwise ops, `sum`/`mean` with axes, `reshape`, `.T`, 2-d `matmul`; `nn` (Linear, ReLU, Tanh, Sequential, mse_loss, log_softmax, cross_entropy); `optim.SGD` with momentum; `grad_check`.
- 37 unit tests: every op against numerical gradients, broadcasting, shared and diamond graphs, a 3000-deep graph, learning a line and XOR, stable softmax, 30 random expressions against NumPy when installed.
- The same tests pass inside real Pyodide with no NumPy (`packages/runner`), and run in `pnpm verify`.
- Mutation check: 11 injected bugs, all caught (a 12th pattern did not apply).
- ADR 0010 (pure Python, not NumPy). README corrected.

Sources used
- PyTorch autograd mechanics docs and the micrograd README (fetched 2026-11-11), noted in `research/02-math-ml-foundations.md`. No code copied.

TODO-VERIFY / not done
- The ReLU-gradient-at-0 convention matching PyTorch is from memory.
- No lesson, challenge or quiz uses minitorch yet; it is a library only.
- Speed is untested for anything but tiny sizes; no benchmark.
- Missing: batched matmul, slicing, concatenation, Adam, dropout.
- Reviewer (a separate agent) found no autograd bugs and three edge cases, all fixed with tests: matmul skipped zeros and hid nan/inf, a negative base with a fractional power gave a complex number, and the power gradient raised at 0. Not fixed (minor): mean of an empty tensor and mean(axis) out of range raise different errors; cross_entropy with logits near 1e308 gives nan.

Tomorrow
- Day 14: MockLLM v1 (deterministic LLM simulator for offline lessons).

## Day 14: MockLLM v1

Done
- `packages/mockllm` (TypeScript, no runtime dependencies): real sampling math (`softmax` with temperature, `topK`, `topP`, `sampleIndex`, seeded RNG); a scripted `MockLLM` (first matching rule wins, string/regex/function matchers, seeded reply variants, tool-call replies, `maxTokens` cut with `finishReason: "length"`, text streaming, a call log); a word-hashing `HashingEmbedder` and an exact cosine `VectorStore`.
- 65 unit tests, wired into `pnpm verify` through the workspace test script. Sampling checks use hand-computed values and seeded empirical frequencies.
- ADR 0011 (why TypeScript and what the package does not claim), README, `research/03-llm-fundamentals.md`.

Sources used
- Holtzman et al. 2019 (top-p, top-k, temperature), Hinton et al. 2015 (softmax with temperature), Weinberger et al. 2009 (feature hashing), OpenAI docs on non-determinism and the seed parameter. Fetched 2026-11-11, paraphrased. The arXiv text came through ar5iv summaries, not verbatim reads.

Review
- A separate reviewer found 9 bugs, all reproduced and fixed with tests: softmax returned NaN for NaN/Infinity logits and tiny temperatures; topK/topP/sampleIndex accepted all-zero input; a falsy non-boolean matcher result counted as a match; tool-call replies were shared by reference; `stream()` of a tool call yielded nothing silently; combining marks split tokens; punctuation made unrelated texts look similar; cosine could exceed 1. Its surviving-mutation suggestions are now covered (the float epsilon in topP was checked by removing it).
- Its remaining notes are documented, not changed: an over-long first word with a tiny `maxTokens` gives empty content.

TODO-VERIFY / not done
- What Anthropic's docs say about temperature 0 and determinism: not read. The note says so.
- Cosine similarity has no primary source fetched. The Fan et al. top-k wording came from a summary only.
- The reply shape is our own; check before any lesson says it matches a provider's format.
- Nothing uses the package yet (no lesson, challenge or game). The embedder understands words, not meaning.
- Not built: beam search, repetition penalties, a toy n-gram generator, injected rate limits and errors.
- Deploys are still manual (Pages is on and the site is live; the Day 14 code is not in the web app, so no redeploy is needed).

Tomorrow
- Day 15: start Realm 1 (Programming): first Python-foundations quest.

## Day 15: Python basics quest (Realm 1) and animation research

Done
- First Realm 1 quest, `content/01-programming/python-basics`: five-tier lesson (names and mutability, numbers and floats, strings and slices, the four containers, loops, truthiness), 17 quiz items (predict-output and spot-bug included), 22 flashcards, 8 common mistakes, 10 interview questions, 7 primary sources, a boss gauntlet, and two challenges (`word-frequencies`, `moving-average`) with hidden tests and 11 wrong-answer mutants, all caught by challenge CI.
- The quest page builds and passes the axe check in light and dark; the Python basics page is now in the accessibility route list.
- Owner asked for anime-quality animation (One Piece-style energy). Researched it first: `research/09-anime-animation.md` (techniques, tool licences, accessibility limits, ranked plan, an FX kit API). Nothing built yet.

Sources used
- docs.python.org: tutorial (introduction, control flow, data structures, floating point), data model, built-in types, built-in functions, What's New 3.7. Fetched 2026-11-12; every snippet re-run on Python 3.13.7. See `research/01-programming.md`.
- Animation research: Phaser 4 migration guide and installed package, WCAG 2.2 three-flashes page, licence pages for GSAP, Spine, Live2D, Rive, Motion, Lottie, and one animation-craft blog on frame-rate modulation.

Review
- A separate reviewer ran every snippet (all correct) and found: the word-count spec did not say words come back lowercase; a `string.punctuation` strip, a regex split and a rounding version of moving average all passed the tests; the lesson overstated "tuples work as dict keys" and under-explained shallow copies; the `round` docs were not cited; one distractor explanation was wrong; 13 of 17 correct answers were option 2. All fixed with tests, and the answers are now spread across positions.

Decisions
- No new ADR. The quest follows the Depth Ladder and ADR 0002; `miniGame` is `none-yet` (the schema needs a value; no game exists for this quest, and the lesson does not promise one).

TODO-VERIFY / not done
- f-strings are not taught: the tutorial only links to the reference. Sets being mutable comes from general knowledge and the stdtypes page, not the data-model page.
- The comparison with C-style division in a quiz note is general knowledge, not from the Python docs.
- Animation research gaps: Blocky and Bokeh filter names in Phaser 4, Rive editor and dotLottie licence terms, the US Copyright Office AI conclusions, hit-stop timing numbers (blogs disagree, tune by feel), filter cost on low-end phones.
- No manual screen-reader pass on the new page. Pyodide runs the challenges only in CI, not yet checked by hand in the browser.

Tomorrow
- Day 16: Realm 1 continues with the Functions and modules quest, unless the owner chooses to start the anime FX kit first (hit-stop, speed lines, cut-in banner, shockwave; see `research/09-anime-animation.md`).

## Day 16: FX kit for anime-style game feel

Done
- `packages/games/src/fx`: a pure, Phaser-free kit (ADR 0012). Hit-stop, trauma camera shake, zoom punch, speed and focus lines redrawn on twos, shockwave rings, easing with overshoot, a flash limiter capped at the WCAG limit, and a zoom-pinning helper. It takes time as input and returns a frame to draw. 55 unit tests; a mutation run of 14 injected bugs in `kit.ts` found 7 gaps, all closed, so all 14 are now caught.
- Gradient Hiker uses it: a win gets a 90 ms freeze, a 5% punch-in, a ring and radial lines; flying past the goal gets a 60 ms freeze, a shake and streaks. The HUD is pinned against zoom and the camera has a solid background. Reduced motion or Focus mode runs none of it.
- `CutIn` banner on level-up and new rank (angled band, overshoot slide, still speed lines at the sides, hidden from screen readers; the XP toast, now above it, is the announcement). 4 new Playwright tests; full suite 33 passed; `pnpm verify` green.
- README and the Hiker SPEC updated.

Sources used
- `research/09-anime-animation.md` (written earlier today): Phaser 4 migration guide and package, WCAG 2.2 three-flashes page, licence pages, one craft article on frame-rate modulation.

Review
- A separate reviewer found: NaN time step silently killed shake; Infinity durations held effects forever; huge line counts ran out of memory; the shared idle frame was mutable; the cut-in lines flickered on twos at about 12 changes a second, a possible flashing pattern under WCAG 2.3.1; zoom clipped the Hiker HUD; shake showed the page behind the canvas; the toast could sit under the banner. All fixed with tests. Not fixed: a level change does not alter an effect already running.

TODO-VERIFY / not done
- The canvas speed lines still redraw on twos for about 0.4 s. The reviewer judged them low risk (thin, translucent, brief); not measured against the WCAG area and luminance thresholds.
- Effect numbers (hit-stop, shake, zoom) are tuned by feel. Not tested on a low-end phone. Not looked at on a real touch device.
- No in-app effects setting yet; only reduced motion and Focus mode change the level. The world map has no effects.
- Not built: impact frames, smear and afterimages, cel-shading filters, mascot pose stepping, particle sparkles beyond the existing burst.
- The dev server (`next dev` from the repo root) returns 500 on quest pages because the content path assumes it runs from `apps/web`; production build and the Playwright server are fine. Not fixed.

Tomorrow
- Day 17: Realm 1 continues with the Functions and modules quest (`python-functions-and-modules`).

## Day 17: Functions and modules quest (Realm 1)

Done
- Second Realm 1 quest, `content/01-programming/python-functions-and-modules`: five-tier lesson (parameters and arguments, `*args` and `**kwargs`, keyword-only and positional-only, defaults evaluated once, how a call receives objects, name lookup, `global` and `nonlocal`, closures and the loop trap, lambda and `partial`, modules, the `__main__` guard, packages), 16 quiz items (all eight predict-output answers re-run as code), 23 flashcards, 8 common mistakes, 10 interview questions, 6 primary sources, a boss gauntlet interleaving Python basics, and two challenges (`make-counter`, `collect-items`) with hidden tests and 11 wrong-answer mutants, all caught.
- A real accessibility fix found by axe on the new page: code blocks wider than the column scrolled but could not take keyboard focus. Every lesson code block is now a tab stop (`pre` in the MDX map).
- Full checks: `pnpm verify` green, web build OK, 35 Playwright tests pass (the new page is in the axe route list, light and dark).

Sources used
- docs.python.org: tutorial (defining functions, scopes and namespaces, modules and packages, data structures), Programming FAQ, functools. Fetched 2026-11-12; every snippet re-run on Python 3.13.7. See `research/01-programming.md`.

Review
- A separate reviewer ran every snippet (all correct) and found: the reference counter returned an inexact first value for awkward floats and failed for non-numbers (the hint recommended it); unsourced claims (linters, `list.sort` convention) and a `lru_cache` source with no lesson text; no caveat for namespace packages, reload, or annotations; one quiz distractor that could really work; no test for `collect(1, None)`. All fixed, with a new hidden test and a new mutant for the counter.

Decisions
- No new ADR. `miniGame` is `none-yet` again; the lesson promises no game.

TODO-VERIFY / not done
- Not verified in real Pyodide: error message wording differs by Python version and Pyodide's version may differ from 3.13; the challenges assert exception types only, and CI runs 3.12.
- `sys.modules` caching rests on a local run, not on the Modules tutorial page; the import system reference was not read.
- Python 3.14 deferred annotations behaviour is unverified; the lesson only says annotations are not checked at run time.
- Decorators, generators and error handling are mentioned as next steps but not taught here.
- No manual screen-reader pass of the new page or its focusable code blocks.

Tomorrow
- Day 18: Realm 1 continues with Classes and exceptions (`python-oop-and-errors`), unless the owner asks for the next anime FX slice first.

## Day 18: Classes and exceptions quest (Realm 1)

Done
- Third Realm 1 quest, `content/01-programming/python-oop-and-errors`: five-tier lesson (classes, instances and `self`, class versus instance attributes and the shared-list bug, inheritance and `super()`, `__repr__` and `__str__`, `__eq__` and hashing, dataclasses, properties, `try`/`except`/`else`/`finally`, raising, chaining with `from`, custom exceptions), 17 quiz items (all nine predict-output answers re-run as code), 24 flashcards, 8 common mistakes, 10 interview questions, 6 primary sources, a boss gauntlet interleaving the Functions quest, and two challenges (`bank-account`, `parse-ratio`) with hidden tests and 17 wrong-answer mutants, all caught.
- The quest page passes axe in light and dark; `pnpm verify` green; web build OK; 37 Playwright tests pass.

Sources used
- docs.python.org: tutorial (Classes, Errors and Exceptions), data model, built-in exceptions, dataclasses, functions (property). Fetched 2026-11-12; every behaviour re-run on Python 3.13.7. The dataclasses hashing and mutable-default rules were also read from the docs during review. See `research/01-programming.md`.

Review
- A separate reviewer ran every snippet (all correct) and found: "the instance first, then the class" overstated (a property wins); a lingering TODO-VERIFY on frozen dataclass hashing (now resolved from the docs); "mutable default" is really "unhashable default" (list, dict or set); `return` in `finally` may warn on newer Python; the visible bank tests never checked the negative-start rule; the starter did not say floats are allowed; the ratio spec said "whole numbers" while `int()` also accepts "+1", "1_0" and similar. All fixed, and the ratio spec now says so and tests it.

Decisions
- No new ADR. `miniGame` is `none-yet`; no game is promised.

TODO-VERIFY / not done
- Whether Python 3.14 warns about `return` in `finally` (PEP 765): the lesson says "may warn" and marks it.
- Exception message wording and the Python version in Pyodide were not checked; tests assert exception types only. Challenges not run in real Pyodide by hand.
- Dataclass `slots`, `kw_only` and `field` options, abstract base classes, protocols, context-manager classes (`__enter__`/`__exit__`) and exception groups are mentioned or omitted, not taught.
- A spec-valid account using a property and `ValueError` as the base of `InsufficientFunds` passes the tests though the docstring says "normal attribute"; left as is.
- No manual screen-reader pass on the new page.

Tomorrow
- Day 19: Realm 1 continues with Generators and iterators (`generators-and-iterators`), unless the owner asks for the next anime FX slice first.

## Day 19: More anime FX (afterimages, impact frame, effects setting, boss cut-ins)

Done
- FX kit (`packages/games/src/fx`): `trace()` leaves up to four fading afterimages behind a moving thing; `impactFrame()` is a dark ink overlay (alpha 0.7 then 0.35, each held about 83 ms on twos), never white, level 2 or higher, off under reduced motion, and limited to one start per second by the flash limiter. 61 fx unit tests; the timing, alphas and ghost fade are pinned exactly after the reviewer showed four mutants survived.
- Gradient Hiker: afterimages trail the hiker while it glides; the boss win also plays the impact frame.
- Effects setting in Settings: Off, Low, Normal (default), High, saved on `<html data-fx>` and in localStorage and applied before first paint, like the theme. It feeds the Hiker game and the cut-in banners. Reduced motion and Focus mode still override it, and now also hide the banners.
- Boss cut-ins on the Hiker page: "BOSS BATTLE" on picking the boss, "BOSS DEFEATED" on a win (after the glide, at the top so it never overlaps the level-up banner).
- Checks: `pnpm verify` green (187 games and 87 web unit tests), web build OK, 42 Playwright tests pass (9 new for the setting, saving, bad values, banners at Normal and Off, and reduced motion).

Sources used
- `research/09-anime-animation.md` and WCAG 2.2 three-flashes page (re-read by the reviewer with numbers). No new sources.

Review
- A separate reviewer found: with the full-canvas impact frame on the light theme the limiter's old 2 per second sat exactly on the WCAG limit of 3 (one impact counts as a flash pair; two a second can count as three), so it is now 1 per second; Phaser's tween stop does not fire its completion, so the glide flag stayed set on reset and level change, leaving a stale ghost and letting a reset run play a boss effect; the "BOSS DEFEATED" banner started before the glide finished; it could overlap the level-up banner; banners ignored reduced motion and Focus mode; four mutants of the new kit survived. All fixed with tests.
- Not fixed (low): `update(0)` repeated holds an impact frame (real frames always have time passing); the impact overlay briefly dims the goal labels; Settings briefly shows Normal before reading the saved choice.

Decisions
- ADR 0012 updated (afterimages, impact frame, the setting, banners and their accessibility rules).

TODO-VERIFY / not done
- Afterimages and the impact frame were not seen on screen: a screenshot is too slow to catch effects lasting a fraction of a second. They are covered by fake-time unit tests and the Hiker integration was reviewed by reading, not by an automated Phaser run.
- Whether real users find 0.7 dark impact too strong on the light theme: untested. Low-end phone cost unmeasured.
- Not built: cel-shaded map look, mascot pose stepping, effects on the world map, a true smear (stretched frame).

Tomorrow
- Day 20: Realm 1 continues with Generators and iterators (`generators-and-iterators`).
