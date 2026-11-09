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
