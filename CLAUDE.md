# AIForge project rules

Open-source gamified academy: zero to production-ready AI engineer. Read
`PLAN.md` and the last `DAILY_LOG.md` entry before working.

## Non-negotiables
- Code MIT, lesson content CC BY-SA 4.0. Local-first, static export, no backend in v1.
- Research before writing, from primary sources fetched this session. Paraphrase; at most one quote under 15 words per source. Never invent facts, versions, numbers, API signatures or URLs; mark doubts `TODO-VERIFY`.
- Facts that rot get `verifiedOn: YYYY-MM-DD` and an entry in `content/_freshness.yml`.
- Every executable challenge: starter must fail, solution must pass (CI).
- Accessible and fast: keyboard navigable, `prefers-reduced-motion` respected, colour-blind-safe palettes, games lazy-load.
- Be honest about the browser: Pyodide cannot run PyTorch/CUDA/real LLMs. Use minitorch, MockLLM, lab quests or BYOK.
- Gamification never blocks learning: no lockouts, no dark patterns.

## Stack (see docs/adr/0001-stack.md)
Next.js App Router + TypeScript + Tailwind (static export), pnpm workspace, Phaser 4, MDX + Zod, Monaco, Pyodide in a Web Worker, Zustand + Dexie, KaTeX, Vitest, Playwright + axe.

## Art direction (see docs/adr/0002-art-direction.md)
Anime-inspired arcade look. All characters, mascots, sprites and music must be original. Never use assets from existing franchises.

## Quest template (Depth Ladder)
L1 Intuition, L2 Mechanics, L3 Build it, L4 Production reality, L5 Frontier. Each quest also has Core Fundamentals and Core Complexity boxes, 5+ common mistakes, 8+ interview questions, 12+ quiz items, 15+ flashcards, an explain-it-back prompt, a mini-game id, a boss, and 4+ primary sources.

## Definition of Done
See `.github/PULL_REQUEST_TEMPLATE.md`. `pnpm verify` must be green.

## Git conventions
- Commit often, one topic per commit, human-sounding imperative messages (for example "Add quiz bank for gradient descent").
- Commits are authored by the repository owner only. No tool or assistant attribution, no Co-Authored-By trailers, no "generated with" footers, in commits, PRs or files.
- Push only when the owner has configured a remote.

## Workflow
One vertical slice per day via `/daily`. Reviewer must differ from the writer. After each day, stop.
