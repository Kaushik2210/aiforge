# ADR 0008: Dashboard, Daily Quest and Review Tavern

Status: accepted, 2026-11-10

## Review Tavern
- A sitting is plain data and pure functions (`reviewsession.ts`): one card at a
  time, rated Again / Hard / Good / Easy (keys 1 to 4), each button showing when the
  card would come back (taken from the real SM-2 scheduler, so it cannot disagree).
- **Only the first rating counts for scheduling.** A card rated Again comes back once
  at the end of the sitting for practice, but its lapse is not erased by getting the
  retry right.
- A sitting adds at most 10 never-seen cards (`maxNew`), so a new quest cannot flood
  a session. The button shows the real sitting size and the page says why when more
  are due.
- If fewer than 5 cards are due but the deck has 5, "Practice 5 cards anyway" tops
  the sitting up with the cards due soonest. SM-2 allows early review, and this keeps
  the daily review goal and the streak always reachable.
- Finishing a quest's first tier puts its flashcards in the deck automatically; the
  Tavern also offers "Add cards" per deck.
- A sitting of 5 or more cards counts for the streak (unchanged rule); XP is 2 per
  card, capped at 40.

## Daily Quest
- Three goals a day, one each of: a step, a 5-card review set, something to build
  or play. Chosen **deterministically from the date**, so it is the same all day and
  on every device with the same progress. The step goal ignores tiers finished
  earlier today, so it does not change after you complete it.
- **Completion is read from what you actually did** (the XP ledger and step times),
  never from the plan, so the two cannot drift. Any game win counts, not just the
  suggested level.
- The +25 XP bonus is claimed with an event that checks all three goals and that no
  bonus was already paid today (a ledger entry `daily-quest`/date). Claiming twice
  pays nothing; claiming is not streak activity. No schema change was needed.
- Nothing is a penalty: skipping costs nothing.

## Dashboard
- **Practice calendar** (26 weeks): presence comes from the streak's full list of
  active days; intensity from the XP ledger (1 active, 2 at 20 XP, 3 at 50, 4 at 100).
  Single hue, tooltips and a table of the last 14 days, so colour is never the only signal.
- **XP over 30 days**: ends at the exact XP total; earlier days are found by
  subtracting each day's XP backwards. The ledger keeps only the latest 300 awards,
  so the chart marks days before that as unknown and says so instead of guessing.
- **Mastery radar** by realm, with a table of the same numbers and a "worth a visit
  next" list. Planned realms read 0%.
- **Today panel** (also on the home page): quest, streak with a plain-language
  state, due cards, and the next tier to continue.
- Every chart is hand-built SVG from tokens (light and dark), responsive, with a text
  or table equivalent.

## What is tested
- Engine (new tests): heatmap grid and levels, daily XP in the learner's zone, XP
  series including a trimmed ledger, quest generation and stability, evaluation at
  local midnight, idempotent claiming, review sitting flow, early-practice queue.
  Chart geometry has its own tests.
- In a real browser: auto-enrolment, a keyboard sitting with a retry, the summary,
  all three quest goals, the claim (once), persistence across reloads, phone width.
- Bugs found that way or by tests: the XP series reported a trimmed ledger as
  complete (reversed date arguments); the review button promised 17 cards while the
  sitting held 10; charts overflowed the grid and clipped radar labels; the game
  goal text implied a specific level was required.

## Known limits
- XP-based intensity and the XP chart only reach as far as the ledger (300 awards).
- Mastery still has no boss component (bosses are not playable yet) and flashcard
  retention is a heuristic (SM-2 has no forgetting curve of its own).
- The quest catalog is built at build time; a new quest appears after a rebuild.
- No automated browser test yet (Playwright, Days 11 and 12).
