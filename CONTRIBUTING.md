# Contributing to AIForge

Thanks for helping. The most useful contributions, in order: factual
corrections, new quiz/flashcard items, new quests, then code.

## Setup

```bash
pnpm install
pnpm verify   # typecheck, unit tests, content validation, challenge CI
```

## Writing a quest

Every quest follows the five-tier depth ladder (Intuition, Mechanics, Build it,
Production reality, Frontier) and must meet the Definition of Done in the PR
template. Ground rules:

1. Write from primary sources (official docs, original papers, maintainers).
   Paraphrase; quote at most one short phrase (under 15 words) per source.
2. Anything that goes stale (versions, prices, model names, benchmarks) gets a
   `verifiedOn: YYYY-MM-DD` date and an entry in `content/_freshness.yml`.
3. Every code challenge ships `starter.py`, `solution.py`, `tests.py` and
   `hints.md`. CI requires the starter to fail and the solution to pass.
4. Mark anything you could not confirm as `TODO-VERIFY` rather than guessing.

## Commits and PRs

Small, focused commits with clear imperative messages, for example
`Add quiz bank for gradient descent` or `Fix off-by-one in streak freeze`.
One topic per commit where practical.

## Art and characters

Anime-inspired visuals are welcome, but must be original. Do not submit
characters, logos, sprites or music from existing franchises.
