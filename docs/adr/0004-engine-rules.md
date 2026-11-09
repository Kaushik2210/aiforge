# ADR 0004: XP, level and streak rules

Status: accepted, 2026-11-09

## XP and levels
- Cost to go from level n to n+1 is 100 + 25*(n-1) XP. Cumulative XP to reach
  level n is `100*(n-1) + 25*(n-1)*(n-2)/2`. Max level 100.
- Ranks (by level): Initiate 1, Apprentice 5, Practitioner 10, Engineer 20,
  Senior 35, Architect 50, Production-Ready AI Engineer 75. Thresholds are
  tunable constants; rank is not tied to realm completion in v1.
- Awards: first-time actions pay full XP; repeats pay a small fraction so
  nothing can be farmed. Hints reduce challenge XP by 5 each but never below a
  floor of 20, so asking for help is never punished harshly. Bosses pay only at
  the 80% pass mark. Review XP is capped per session.

## Streak
- A day counts when the learner completes at least one lesson step or reviews at
  least 5 cards. The app decides that and calls `recordActivity`.
- A day is the learner's local calendar day. We store the exact instant of the
  last activity (source of truth) plus its local day and the IANA zone, and
  recompute the last day in whatever zone the learner is in now. This makes
  travel east or west and daylight saving (23- and 25-hour days) safe.
- Day gaps are calendar arithmetic, never 24-hour blocks.
- A freeze is earned each time the run reaches a multiple of 7 days, up to 2
  held. Freezes apply automatically to missed days only when they cover the
  whole gap (all or nothing). Frozen days protect the run but are not counted as
  practice and do not appear in the activity heatmap.
- Breaking a streak grants a flat 25 XP comeback bonus. The longest streak is
  never reduced.
- A timestamp earlier than the last one (clock skew, imports) is ignored and
  never reduces progress.
- Imports are validated strictly (`validateStreakState`) and two states can be
  merged (`mergeStreakStates`): later run wins, longest is the best of both,
  active days are the union.

## How it is tested
Hand-written cases (midnight, DST in 11 zones for a full year, travel, date
line, leap days), plus 300 randomised histories compared with an independent
day-by-day oracle, plus mutation testing: ten deliberately injected bugs (24-hour
arithmetic, stale stored day, freeze misuse, cap off by one, and so on) were all
caught by the suite.

## Not decided here
Review sessions and "daily quest" composition (Day 10), spaced repetition and
mastery (Day 7).
