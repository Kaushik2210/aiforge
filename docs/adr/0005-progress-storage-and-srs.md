# ADR 0005: Progress storage, spaced repetition and mastery

Status: accepted, 2026-11-09

## Storage
- All progress is one JSON-safe snapshot (`ProgressSnapshot`, schema version 1)
  stored as a single row in IndexedDB through Dexie. A learning event is applied
  by a pure reducer (`applyEvent` in `@aiforge/engine`) inside one read-modify-write
  transaction, so two quick events or two tabs cannot lose each other's updates
  (tested with 25 concurrent events and two connections).
- XP total is stored exactly; the ledger keeps only the last 300 awards.
- Corrupt data is never silently destroyed: it is copied to a `backups` table
  (last 3 kept) and the learner is told. Data saved by a newer app version is
  left untouched and the app goes read-only.
- Imports go through: JSON parse, file-kind check, `migrate()`, strict
  validation (types, ranges, safe keys that reject `__proto__` and friends,
  unknown fields dropped). A bad file changes nothing. A valid import backs up
  the current data first. Import can replace or merge (best of both).
- Two layers of versioning: Dexie `version(n)` for table layout, and the
  snapshot's `schemaVersion` with a migration registry for the data's shape.
  Only version 1 exists, so the registry is empty; the runner is tested with
  synthetic migrations.
- If IndexedDB is blocked (private window), the app runs in memory and says so;
  export still works.
- Tabs stay in sync through a `BroadcastChannel`.

## Spaced repetition: SM-2
SM-2 is implemented exactly as published (verified 2026-11-09 at
super-memory.com/english/ol/sm2.htm): quality 0 to 5, EF starts at 2.5 and
changes by `0.1 - (5-q)(0.08 + (5-q)0.02)` with a floor of 1.3, intervals of 1 day,
6 days, then previous interval times EF rounded up; quality below 3 restarts the
schedule and leaves EF alone. AIForge choices: Again/Hard/Good/Easy map to q of
1/3/4/5, intervals capped at 365 days, the interval uses the EF after the
review's update, due dates are learner-local calendar days.
FSRS is a candidate to replace it later. Its constants differ between versions and
the official page could not be read this session, so none are reproduced from
memory (TODO-VERIFY when adopting it).
Review sessions interleave topics round-robin (seeded, reproducible), most
overdue first, with a cap on never-seen cards.

## Mastery (0 to 100)
Quiz accuracy 25% (Laplace-smoothed and scaled by evidence), flashcard retention
35% (estimated recall, unseen cards count 0), best boss score 40%. Missing
evidence counts as 0, so 100% needs all three. Weights are first drafts.

## What counts as streak activity
A completed lesson step (tiers), a passed challenge, or a review session of 5+
cards. Quiz answers alone do not.
