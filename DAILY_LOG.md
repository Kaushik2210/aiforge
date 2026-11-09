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
