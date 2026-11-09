import { describe, expect, it } from "vitest";
import { addDays, instantFromLocal, localDateKey } from "./dates";
import {
  COMEBACK_BONUS_XP,
  MAX_FREEZES,
  mergeStreakStates,
  newStreakState,
  recordActivity,
  streakStatus,
  validateStreakState,
  type StreakEvent,
  type StreakState,
} from "./streak";

const NY = "America/New_York";

/** Local wall time in a zone -> instant. */
const at = (zone: string, day: string, hh = 12, mm = 0, ss = 0) =>
  instantFromLocal(day, { hour: hh, minute: mm, second: ss }, zone);

/** Apply a list of activity instants in one zone. */
function play(zone: string, instants: number[], from?: StreakState) {
  let state = from ?? newStreakState(zone);
  const all: StreakEvent[][] = [];
  for (const t of instants) {
    const r = recordActivity(state, t, zone);
    state = r.state;
    all.push(r.events);
  }
  return { state, events: all };
}

/** One activity per consecutive local day starting at `start`. */
const daily = (zone: string, start: string, n: number, hh = 12) =>
  Array.from({ length: n }, (_, i) => at(zone, addDays(start, i), hh));

const types = (events: StreakEvent[]) => events.map((e) => e.type);

describe("basics", () => {
  it("first activity starts a streak of 1", () => {
    const { state, events } = play(NY, [at(NY, "2026-11-09")]);
    expect(state).toMatchObject({ current: 1, longest: 1, freezes: 0, lastActiveDay: "2026-11-09", activeDays: ["2026-11-09"] });
    expect(types(events[0]!)).toEqual(["started"]);
  });

  it("a second activity the same day changes nothing", () => {
    const { state, events } = play(NY, [at(NY, "2026-11-09", 8), at(NY, "2026-11-09", 21)]);
    expect(state.current).toBe(1);
    expect(state.activeDays).toEqual(["2026-11-09"]);
    expect(types(events[1]!)).toEqual(["already-counted"]);
    expect(state.lastActiveAt).toBe(at(NY, "2026-11-09", 21));
  });

  it("consecutive days extend the streak", () => {
    const { state } = play(NY, daily(NY, "2026-11-01", 5));
    expect(state.current).toBe(5);
    expect(state.longest).toBe(5);
    expect(state.activeDays).toHaveLength(5);
  });

  it("works across month, year and leap-day boundaries", () => {
    expect(play("UTC", daily("UTC", "2026-12-29", 5)).state.current).toBe(5);
    expect(play("UTC", daily("UTC", "2028-02-27", 4)).state.activeDays).toEqual([
      "2028-02-27", "2028-02-28", "2028-02-29", "2028-03-01",
    ]);
    expect(play("UTC", daily("UTC", "2026-02-27", 3)).state.activeDays).toEqual([
      "2026-02-27", "2026-02-28", "2026-03-01",
    ]);
  });

  it("does not mutate the state it is given", () => {
    const s0 = Object.freeze({ ...newStreakState(NY), activeDays: Object.freeze([]) as unknown as string[] });
    const before = JSON.stringify(s0);
    recordActivity(s0, at(NY, "2026-11-09"), NY);
    expect(JSON.stringify(s0)).toBe(before);
  });

  it("rejects an invalid zone", () => {
    expect(() => newStreakState("Nope/Zone")).toThrow(RangeError);
    expect(() => recordActivity(newStreakState(NY), 0, "Nope/Zone")).toThrow(RangeError);
  });
});

describe("breaking, comeback and the longest streak", () => {
  it("one missed day with no freeze resets to 1 but keeps the longest", () => {
    const { state, events } = play(NY, [...daily(NY, "2026-11-01", 3), at(NY, "2026-11-05")]);
    expect(state.current).toBe(1);
    expect(state.longest).toBe(3);
    expect(types(events.at(-1)!)).toEqual(["broken", "comeback"]);
    expect(events.at(-1)![0]).toEqual({ type: "broken", previous: 3 });
    expect(events.at(-1)![1]).toEqual({ type: "comeback", daysAway: 2, bonusXp: COMEBACK_BONUS_XP });
  });

  it("the longest streak survives any number of later breaks", () => {
    let t = daily(NY, "2026-01-01", 6);
    t = [...t, ...daily(NY, "2026-03-01", 2), ...daily(NY, "2026-06-01", 3)];
    expect(play(NY, t).state.longest).toBe(6);
  });

  it("a very long break is still just a comeback, never negative", () => {
    const { state, events } = play(NY, [at(NY, "2026-01-01"), at(NY, "2027-06-01")]);
    expect(state.current).toBe(1);
    expect(types(events[1]!)).toContain("comeback");
  });

  it("the very first activity is not a comeback", () => {
    expect(types(play(NY, [at(NY, "2026-01-01")]).events[0]!)).not.toContain("comeback");
  });
});

describe("freezes", () => {
  it("earns one at 7 days, two at 14, and stops at the cap", () => {
    const seven = play(NY, daily(NY, "2026-01-01", 7));
    expect(seven.state.freezes).toBe(1);
    expect(types(seven.events[6]!)).toContain("freeze-earned");

    const fourteen = play(NY, daily(NY, "2026-01-01", 14));
    expect(fourteen.state.freezes).toBe(2);

    const twentyOne = play(NY, daily(NY, "2026-01-01", 21));
    expect(twentyOne.state.freezes).toBe(MAX_FREEZES);
    expect(types(twentyOne.events[20]!)).not.toContain("freeze-earned");
  });

  it("a freeze automatically covers one missed day", () => {
    const { state, events } = play(NY, [...daily(NY, "2026-01-01", 7), at(NY, "2026-01-09")]);
    expect(state.current).toBe(8);
    expect(state.freezes).toBe(0);
    expect(events.at(-1)![0]).toEqual({ type: "freeze-used", days: ["2026-01-08"], remaining: 0 });
    expect(types(events.at(-1)!)).not.toContain("broken");
  });

  it("frozen days protect the run but are not counted as practice", () => {
    const { state } = play(NY, [...daily(NY, "2026-01-01", 7), at(NY, "2026-01-09")]);
    expect(state.activeDays).not.toContain("2026-01-08");
    expect(state.activeDays).toHaveLength(8);
  });

  it("two freezes cover a two-day gap", () => {
    const { state } = play(NY, [...daily(NY, "2026-01-01", 14), at(NY, "2026-01-17")]);
    expect(state.current).toBe(15);
    expect(state.freezes).toBe(0);
  });

  it("freezes are all-or-nothing: if they cannot cover the gap none are spent", () => {
    const { state, events } = play(NY, [...daily(NY, "2026-01-01", 7), at(NY, "2026-01-10")]);
    expect(state.current).toBe(1);
    expect(state.longest).toBe(7);
    expect(state.freezes).toBe(1); // kept for next time
    expect(types(events.at(-1)!)).toEqual(["broken", "comeback"]);
  });

  it("using a freeze can land exactly on a multiple of 7 and earn the next one", () => {
    const { state, events } = play(NY, [
      ...daily(NY, "2026-01-01", 7), // 7 days, 1 freeze
      ...daily(NY, "2026-01-08", 6), // 13 days
      at(NY, "2026-01-15"), // skip Jan 14 -> uses the freeze, current 14, earns one back
    ]);
    expect(state.current).toBe(14);
    expect(state.freezes).toBe(1);
    expect(types(events.at(-1)!)).toEqual(["freeze-used", "extended", "freeze-earned"]);
  });

  it("freezes survive a broken streak", () => {
    const { state } = play(NY, [...daily(NY, "2026-01-01", 7), at(NY, "2026-01-12")]);
    expect(state.freezes).toBe(1);
  });
});

describe("local midnight", () => {
  it("23:59:59 then 00:00:00 are consecutive days", () => {
    const { state } = play(NY, [at(NY, "2026-11-09", 23, 59, 59), at(NY, "2026-11-10", 0, 0, 0)]);
    expect(state.current).toBe(2);
  });

  it("00:00:00 and 23:59:59 on the same day are one day", () => {
    const { state } = play(NY, [at(NY, "2026-11-09", 0, 0, 0), at(NY, "2026-11-09", 23, 59, 59)]);
    expect(state.current).toBe(1);
  });

  it("two activities one second apart across midnight count as two days", () => {
    const t = at(NY, "2026-11-09", 23, 59, 59);
    const { state } = play(NY, [t, t + 1000]);
    expect(state.current).toBe(2);
  });

  it("works for half-hour and 45-minute zones", () => {
    for (const z of ["Asia/Kolkata", "Asia/Kathmandu", "Australia/Eucla"]) {
      const { state } = play(z, [at(z, "2026-05-01", 23, 59, 59), at(z, "2026-05-02", 0, 0, 0), at(z, "2026-05-03", 12)]);
      expect(state.current, z).toBe(3);
    }
  });
});

describe("daylight saving time", () => {
  it("US spring-forward (23-hour day): 23:30 to 23:30 is consecutive days", () => {
    const { state } = play(NY, [at(NY, "2026-03-07", 23, 30), at(NY, "2026-03-08", 23, 30), at(NY, "2026-03-09", 23, 30)]);
    expect(state.current).toBe(3);
  });

  it("US spring-forward: skipping the whole short day still counts as a missed day", () => {
    const { state, events } = play(NY, [at(NY, "2026-03-07", 23, 30), at(NY, "2026-03-09", 0, 30)]);
    expect(state.current).toBe(1);
    expect(types(events[1]!)).toContain("broken");
  });

  it("US fall-back (25-hour day): activity at both ends is still one day", () => {
    const { state, events } = play(NY, [at(NY, "2026-11-01", 0, 30), at(NY, "2026-11-01", 23, 30)]);
    expect(state.current).toBe(1);
    expect(types(events[1]!)).toEqual(["already-counted"]);
  });

  it("US fall-back: the next local morning is the next day", () => {
    const { state } = play(NY, [at(NY, "2026-11-01", 23, 30), at(NY, "2026-11-02", 0, 10)]);
    expect(state.current).toBe(2);
  });

  it("a year of daily activity never breaks in any DST zone", () => {
    const zones = [
      NY, "Europe/London", "Europe/Berlin", "Pacific/Auckland", "Australia/Sydney",
      "Australia/Lord_Howe", "Pacific/Chatham", "Asia/Kolkata", "Pacific/Kiritimati", "Pacific/Pago_Pago", "UTC",
    ];
    for (const z of zones) {
      for (const hh of [12, 23]) {
        const { state, events } = play(z, daily(z, "2026-01-01", 365, hh));
        expect(state.current, `${z} at ${hh}:xx`).toBe(365);
        expect(events.flat().some((e) => e.type === "broken"), z).toBe(false);
        expect(state.freezes).toBe(MAX_FREEZES);
      }
    }
  });
});

describe("travel and time zone changes", () => {
  it("flying east keeps the streak (the day is recomputed in the new zone)", () => {
    const LA = "America/Los_Angeles";
    const TK = "Asia/Tokyo";
    // 23:30 in LA on 4 May is already 5 May afternoon in Tokyo.
    const first = recordActivity(newStreakState(LA), at(LA, "2026-05-04", 23, 30), LA).state;
    const { state, events } = play(TK, [at(TK, "2026-05-06", 9)], first);
    expect(state.current).toBe(2);
    expect(types(events[0]!)).toContain("zone-changed");
    expect(types(events[0]!)).not.toContain("broken");
    expect(state.zone).toBe(TK);
  });

  it("flying west never double counts a day and never loses progress", () => {
    const LA = "America/Los_Angeles";
    const TK = "Asia/Tokyo";
    const first = recordActivity(newStreakState(TK), at(TK, "2026-05-05", 22), TK).state; // 06:00 LA same date
    const second = recordActivity(first, at(LA, "2026-05-05", 20), LA);
    expect(second.state.current).toBe(1);
    expect(types(second.events)).toContain("already-counted");
    const third = recordActivity(second.state, at(LA, "2026-05-06", 10), LA);
    expect(third.state.current).toBe(2);
  });

  it("crossing the date line is handled", () => {
    const KI = "Pacific/Kiritimati"; // UTC+14
    const PP = "Pacific/Pago_Pago"; // UTC-11
    const first = recordActivity(newStreakState(KI), at(KI, "2026-06-10", 20), KI).state; // 9 Jun 19:00 in Pago Pago
    const { state } = play(PP, [at(PP, "2026-06-10", 8)], first);
    expect(state.current).toBe(2);
  });

  it("changing zone on the same day changes nothing but the stored zone", () => {
    const first = recordActivity(newStreakState(NY), at(NY, "2026-11-09", 9), NY).state;
    const { state, events } = play("Europe/Paris", [at("Europe/Paris", "2026-11-09", 20)], first);
    expect(state.current).toBeGreaterThanOrEqual(1);
    expect(types(events[0]!)).toContain("zone-changed");
    expect(state.zone).toBe("Europe/Paris");
  });
});

describe("clock problems", () => {
  it("a timestamp earlier than the last one never reduces the streak", () => {
    const { state, events } = play(NY, [...daily(NY, "2026-11-01", 4), at(NY, "2026-10-20")]);
    expect(state.current).toBe(4);
    expect(state.lastActiveDay).toBe("2026-11-04");
    expect(types(events.at(-1)!)).toEqual(expect.arrayContaining(["clock-went-backwards", "already-counted"]));
  });

  it("replaying the same instant is harmless", () => {
    const t = at(NY, "2026-11-09");
    const { state } = play(NY, [t, t, t]);
    expect(state.current).toBe(1);
    expect(state.activeDays).toHaveLength(1);
  });
});

describe("streakStatus", () => {
  const base = play(NY, daily(NY, "2026-01-01", 7)).state; // current 7, 1 freeze, last active 7 Jan

  it("none before any activity", () => {
    expect(streakStatus(newStreakState(NY), at(NY, "2026-01-01"), NY).kind).toBe("none");
  });
  it("counted-today on the day of activity", () => {
    expect(streakStatus(base, at(NY, "2026-01-07", 22), NY)).toMatchObject({ kind: "counted-today", current: 7 });
  });
  it("at-risk the next day: nothing is lost yet", () => {
    expect(streakStatus(base, at(NY, "2026-01-08", 22), NY)).toMatchObject({ kind: "at-risk", current: 7 });
  });
  it("frozen when a held freeze covers the missed day", () => {
    expect(streakStatus(base, at(NY, "2026-01-09", 9), NY)).toMatchObject({ kind: "frozen", current: 7 });
  });
  it("broken when freezes cannot cover it, but longest is kept", () => {
    expect(streakStatus(base, at(NY, "2026-01-12", 9), NY)).toMatchObject({ kind: "broken", current: 0, longest: 7 });
  });
  it("is read-only", () => {
    const before = JSON.stringify(base);
    streakStatus(base, at(NY, "2026-02-01"), NY);
    expect(JSON.stringify(base)).toBe(before);
  });
});

describe("import, export and merge", () => {
  const live = play(NY, daily(NY, "2026-01-01", 9)).state;

  it("round-trips through JSON", () => {
    const res = validateStreakState(JSON.parse(JSON.stringify(live)));
    expect(res).toEqual({ ok: true, state: live });
  });

  it("accepts a brand-new empty state", () => {
    expect(validateStreakState(newStreakState(NY)).ok).toBe(true);
  });

  it("normalises unsorted and duplicate active days", () => {
    const messy = { ...live, activeDays: ["2026-01-03", "2026-01-01", "2026-01-03"] };
    const res = validateStreakState(messy);
    expect(res.ok && res.state.activeDays).toEqual(["2026-01-01", "2026-01-03"]);
  });

  const bad: [string, unknown][] = [
    ["not an object", 42],
    ["null", null],
    ["wrong version", { ...live, version: 2 }],
    ["negative current", { ...live, current: -1 }],
    ["fractional current", { ...live, current: 1.5 }],
    ["too many freezes", { ...live, freezes: 3 }],
    ["longest below current", { ...live, longest: 2 }],
    ["bad zone", { ...live, zone: "Nope/Zone" }],
    ["bad day", { ...live, lastActiveDay: "2026-02-30" }],
    ["day does not match instant", { ...live, lastActiveDay: "2026-01-01" }],
    ["streak with no activity", { ...newStreakState(NY), current: 3, longest: 3 }],
    ["only one of the pair set", { ...live, lastActiveDay: null }],
    ["bad active day entry", { ...live, activeDays: ["nope"] }],
    ["non-numeric timestamp", { ...live, lastActiveAt: "yesterday" }],
  ];
  it.each(bad)("rejects: %s", (_name, input) => {
    const res = validateStreakState(input);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.length).toBeGreaterThan(0);
  });

  it("merge keeps the later run, the best longest streak and all days", () => {
    const old = play(NY, [...daily(NY, "2025-06-01", 20)]).state; // longest 20, ended 2025
    const merged = mergeStreakStates(live, old);
    expect(merged.current).toBe(live.current);
    expect(merged.longest).toBe(20);
    expect(merged.activeDays).toHaveLength(29);
    expect(mergeStreakStates(old, live)).toEqual(merged); // order does not matter
  });

  it("merging with an empty state returns the other", () => {
    const merged = mergeStreakStates(newStreakState(NY), live);
    expect(merged.current).toBe(live.current);
    expect(merged.activeDays).toEqual(live.activeDays);
  });
});

/* ------------------------------------------------------------------------ */
/* Randomised check against an independent, day-by-day oracle.               */
/* ------------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Walk every calendar day from first to last; no gap arithmetic. */
function oracle(active: Set<string>) {
  const days = [...active].sort();
  let current = 0, longest = 0, freezes = 0, missed = 0, started = false;
  for (let d = days[0]!; d <= days.at(-1)!; d = addDays(d, 1)) {
    if (active.has(d)) {
      if (!started) { started = true; current = 1; }
      else if (missed === 0) current += 1;
      else if (freezes >= missed) { freezes -= missed; current += 1; }
      else current = 1;
      missed = 0;
      longest = Math.max(longest, current);
      if (current % 7 === 0 && freezes < MAX_FREEZES) freezes += 1;
    } else if (started) missed += 1;
  }
  return { current, longest, freezes };
}

describe("randomised: engine agrees with the day-by-day oracle", () => {
  const ZONES = [NY, "Europe/London", "Asia/Kolkata", "Pacific/Auckland", "Australia/Lord_Howe", "UTC"];
  const GAPS = [0, 0, 0, 1, 1, 1, 1, 2, 2, 3, 5, 9];

  it("holds for 300 random histories and keeps its invariants at every step", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rnd = mulberry32(seed);
      const zone = ZONES[Math.floor(rnd() * ZONES.length)]!;
      let day = "2026-01-01";
      let prev = -Infinity;
      let state = newStreakState(zone);
      const active = new Set<string>();

      for (let i = 0; i < 80; i++) {
        day = addDays(day, GAPS[Math.floor(rnd() * GAPS.length)]!);
        let t = instantFromLocal(day, { hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60) }, zone);
        if (t <= prev) t = prev + 3_600_000; // keep time moving forward
        prev = t;

        const r = recordActivity(state, t, zone);
        state = r.state;
        active.add(localDateKey(t, zone));

        // invariants
        expect(state.freezes).toBeGreaterThanOrEqual(0);
        expect(state.freezes).toBeLessThanOrEqual(MAX_FREEZES);
        expect(state.current).toBeGreaterThanOrEqual(1);
        expect(state.longest).toBeGreaterThanOrEqual(state.current);
        expect(state.lastActiveDay).toBe(localDateKey(state.lastActiveAt!, zone));
        expect(state.activeDays).toEqual([...new Set(state.activeDays)].sort());
      }

      const expected = oracle(active);
      expect(
        { current: state.current, longest: state.longest, freezes: state.freezes },
        `seed ${seed} in ${zone}`,
      ).toEqual(expected);
      expect(state.activeDays).toEqual([...active].sort());
    }
  }, 60_000); // heavy by design: 300 histories x 80 steps, each with Intl calls

  it("is deterministic: replaying a history gives an identical state", () => {
    const rnd = mulberry32(99);
    const times: number[] = [];
    let day = "2026-02-01";
    for (let i = 0; i < 40; i++) {
      day = addDays(day, Math.floor(rnd() * 3));
      const t = instantFromLocal(day, { hour: 10 + (i % 5) }, NY);
      times.push(times.length && t <= times.at(-1)! ? times.at(-1)! + 60_000 : t);
    }
    expect(play(NY, times).state).toEqual(play(NY, times).state);
  });
});
