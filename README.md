# AIForge

A free, open-source, browser-based academy that takes you from zero to
**production-ready AI engineer**. Short interactive lessons you code in the
browser, anime-flavoured arcade mini-games that make hard ideas tangible, and
real depth: intuition, mechanics, build-it-yourself, production failure modes,
and the research frontier.

> Status: early scaffolding (Day 1). The first reference quest, *Gradient
> Descent*, is the quality benchmark for everything that follows.

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
  backgrounds are original to this project.

## Repository layout

| Path | Purpose |
|---|---|
| `apps/web` | Next.js app shell (coming Day 2) |
| `packages/content-schema` | Zod schemas and the `content:validate` CLI |
| `packages/engine` | XP, streak, SRS, mastery (pure TypeScript) |
| `packages/runner` | Pyodide worker and test harness |
| `packages/minitorch` | Teaching tensor/autograd library |
| `packages/mockllm` | Deterministic LLM simulator for offline lessons |
| `packages/games` | Phaser mini-games |
| `content/` | Lessons, quizzes, cards, challenges |
| `research/` | Source notes behind each lesson |
| `docs/adr/` | Architecture decision records |

## Getting started

```bash
pnpm install
pnpm verify
```

Requires Node 22 or newer.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Found a factual error in a lesson? Open
a "Factual correction" issue; those are the most valuable contributions.

## Licence

Code: [MIT](LICENSE). Written content: [CC BY-SA 4.0](LICENSE-CONTENT).
