Run exactly one day of the AIForge build plan.

1. Read `CLAUDE.md`, `PLAN.md` and the last entry of `DAILY_LOG.md`. Work out today's day number and slice.
2. Make a task list for the slice. Research first (use subagents for research and for review), then implement.
3. Commit as you go: one topic per commit, with human-sounding imperative messages and no assistant attribution. Aim for many small, meaningful commits rather than one big one.
4. Run `pnpm verify` and fix until green.
5. Have a reviewer subagent (not the writer) check any new content against its sources. Fix findings.
6. Append to `DAILY_LOG.md`: day number, what shipped, sources used, decisions (ADR links), `TODO-VERIFY` items, tomorrow's slice.
7. Commit the log. Push only if a remote is configured.
8. Stop. Print a 5-line summary and tomorrow's slice. Do not start the next day.

Never skip the commit; shrink the slice instead. Never leave the build red.
