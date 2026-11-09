# ADR 0001: Technology stack

Status: accepted, 2026-11-09

## Context
AIForge is a static, local-first, browser-based academy with in-browser Python
execution, interactive lessons and Phaser mini-games. No backend in v1.

## Decision

Versions were read from the npm registry on 2026-11-09 (`npm view <pkg> version`).

| Concern | Choice | Version seen |
|---|---|---|
| Package manager | pnpm workspace | 12.18.0 |
| App shell | Next.js App Router, static export | 16.4.5 |
| UI | React | 19.3.1 |
| Styling | Tailwind CSS | 4.3.5 |
| Language | TypeScript | 7.0.2 |
| Game engine | Phaser | 4.2.1 |
| In-browser Python | Pyodide, in a Web Worker | 314.0.7 |
| Editor | monaco-editor | 0.57.0 |
| Schemas | Zod | 4.6.7 |
| Persistence | Dexie (IndexedDB) | 4.4.7 |
| State | Zustand | 5.1.0 |
| Unit tests | Vitest | 5.1.0 |

Other choices from the brief stand: MDX lessons, KaTeX, Mermaid, Playwright with
axe, GitHub Actions.

## Phaser notes
The brief mentions Phaser 4.1.0; the registry and GitHub releases page show
4.2.1 (released July 2026) as latest. Phaser 4 replaced the v3 pipeline system
with a node-based WebGL renderer and merged FX and masks into one Filter
system. Per the release notes, `setTintFill()` is gone in favour of
`setTint()` with a fill tint mode. Do not copy Phaser 3 snippets from memory;
read the v4 migration guide before writing game code on Day 8.
TODO-VERIFY: read the full v3 to v4 migration guide (page content was not
available in the release notes summary).

## Consequences
Pin exact versions when the app is scaffolded on Day 2 and re-check them then;
the TypeScript, Vitest and pnpm majors in particular should be tested for
compatibility with Next.js before locking in.
