# @aiforge/engine

Pure TypeScript game logic, no dependencies, no I/O. Everything is a pure
function over plain data so it is easy to test and to persist.

| Module | What it does |
|---|---|
| `dates` | Timezone-safe local calendar days (`localDateKey`, `dayDiff`, `instantFromLocal`) |
| `xp` | Level curve, ranks, per-event XP awards |
| `streak` | Streak with freezes, comeback bonus, status, import validation, merge |

```ts
import { newStreakState, recordActivity, streakStatus } from "@aiforge/engine";

let s = newStreakState("Asia/Kolkata");
const r = recordActivity(s, Date.now(), "Asia/Kolkata"); // { state, events }
s = r.state;
streakStatus(s, Date.now(), "Asia/Kolkata"); // { kind: "counted-today", current: 1, ... }
```

Rules and rationale: `docs/adr/0004-engine-rules.md`. Spaced repetition and
mastery arrive on Day 7.
