# AIForge

A free, open-source, browser-based academy that takes you from zero to
**production-ready AI engineer**. Short interactive lessons you code in the
browser, anime-flavoured arcade mini-games that make hard ideas tangible, and
real depth: intuition, mechanics, build-it-yourself, production failure modes,
and the research frontier.

> Status: early. Two quests exist (*Gradient Descent*, the quality benchmark, and
> *Python Basics*, the first of Realm 1). The reference quest is built end to end: lesson, in-browser Python challenges,
> quiz, flashcards, a playable mini-game, a world map, a skill tree, a Review
> Tavern, a Daily Quest and a dashboard. The 23-realm syllabus is planned in
> [PLAN.md](PLAN.md); progress is logged in [DAILY_LOG.md](DAILY_LOG.md).

## What makes it different

- **Five-tier depth ladder** on every topic: Intuition, Mechanics, Build it,
  Production reality, Frontier.
- **Local-first**: no backend, no account. Progress lives in your browser and
  can be exported as JSON.
- **Honest about the browser**: Python runs in Pyodide; heavy GPU topics are
  lab quests with clear instructions rather than fake simulations.
- **Gentle gamification**: XP, streaks with freezes, bosses and spaced
  repetition that support learning and never lock you out.
- **Original anime-inspired art direction**: all characters, mascots and
  backgrounds are original to this project. Effects (hit-stop, shake, speed
  lines, cut-in banners) switch off with reduced motion or Focus mode and never
  flash.

## Repository layout

| Path | Purpose |
|---|---|
| `apps/web` | Next.js static site, Playwright + axe tests in `e2e/` |
| `packages/content-schema` | Zod schemas and the `content:validate` CLI |
| `packages/engine` | XP, streak, SRS, mastery (pure TypeScript) |
| `packages/runner` | Pyodide worker and test harness |
| `packages/minitorch` | Teaching tensor and autograd library in pure Python |
| `packages/mockllm` | Deterministic LLM, embedding and vector-store simulator for offline lessons |
| `packages/games` | Phaser mini-games and the FX kit for anime-style game feel (see [ADR 0012](docs/adr/0012-fx-kit.md)) |
| `content/` | Lessons, quizzes, cards, challenges |
| `research/` | Source notes behind each lesson |
| `docs/adr/` | Architecture decision records |

## Getting started

```bash
pnpm install
pnpm verify                         # typecheck, unit tests, content validation, challenge CI
pnpm --filter @aiforge/web dev      # run the site locally
```

Requires Node 22 or newer and Python 3.12 (the challenge CI runs the solutions).

Browser tests (accessibility with axe, keyboard, reduced motion, user flows):

```bash
pnpm --filter @aiforge/web build
pnpm --filter @aiforge/web exec playwright install chromium
pnpm --filter @aiforge/web test:e2e
```

## Deploying

The site is a static export, so any static host works. For GitHub Pages, turn on
Pages (Source: GitHub Actions) in the repository settings and run the `deploy`
workflow. It builds with `NEXT_PUBLIC_BASE_PATH=/<repository name>`. For a custom
domain at the root, build without it.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Found a factual error in a lesson? Open
a "Factual correction" issue; those are the most valuable contributions.

## Licence

Code: [MIT](LICENSE). Written content: [CC BY-SA 4.0](LICENSE-CONTENT).
