import { describe, expect, it } from "vitest";
import { addDays, dayDiff, instantFromLocal, localDateKey } from "./dates";
import { buildHeatmap, dailyXp, heatLevel, mondayOnOrBefore, weekdayMonday0, xpSeries } from "./activity";
import type { LedgerEntry } from "./progress";

const Z = "Europe/London";
const at = (day: string, hh = 12) => instantFromLocal(day, { hour: hh }, Z);
const entry = (day: string, xp: number, hh = 12): LedgerEntry => ({ at: at(day, hh), kind: "step", xp, ref: "x" });

describe("weekdays", () => {
  it("knows real weekdays (Monday = 0)", () => {
    expect(weekdayMonday0("2026-11-09")).toBe(0); // a Monday
    expect(weekdayMonday0("2026-11-10")).toBe(1);
    expect(weekdayMonday0("2026-11-15")).toBe(6); // Sunday
    expect(weekdayMonday0("1970-01-01")).toBe(3); // Thursday
    expect(weekdayMonday0("1969-12-31")).toBe(2); // before the epoch still works
  });

  it("mondayOnOrBefore never moves forward and lands on a Monday", () => {
    for (let i = 0; i < 40; i++) {
      const d = addDays("2026-10-01", i);
      const m = mondayOnOrBefore(d);
      expect(weekdayMonday0(m)).toBe(0);
      expect(dayDiff(m, d)).toBeGreaterThanOrEqual(0);
      expect(dayDiff(m, d)).toBeLessThan(7);
    }
  });
});

describe("dailyXp", () => {
  it("sums XP by local day, including either side of local midnight", () => {
    const m = dailyXp([entry("2026-11-09", 10, 0), entry("2026-11-09", 5, 23), entry("2026-11-10", 7, 0)], Z);
    expect(m.get("2026-11-09")).toBe(15);
    expect(m.get("2026-11-10")).toBe(7);
  });

  it("uses the learner's zone for the day", () => {
    const t = Date.UTC(2026, 10, 9, 23, 30); // 23:30 UTC
    const e: LedgerEntry = { at: t, kind: "step", xp: 10, ref: "x" };
    expect([...dailyXp([e], "UTC").keys()]).toEqual(["2026-11-09"]);
    expect([...dailyXp([e], "Asia/Kolkata").keys()]).toEqual(["2026-11-10"]);
  });
});

describe("heatLevel", () => {
  it("maps XP to the four levels", () => {
    expect([0, 10, 20, 49, 50, 99, 100, 500].map((xp) => heatLevel(true, xp))).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(heatLevel(false, 500)).toBe(0);
  });
});

describe("buildHeatmap", () => {
  const today = "2026-11-12"; // a Thursday
  const empty = new Map<string, number>();

  it("has the requested number of weeks, each of 7 days, Monday first, ending in today's week", () => {
    const h = buildHeatmap([], empty, today, 26);
    expect(h.weeks).toHaveLength(26);
    for (const col of h.weeks) {
      expect(col).toHaveLength(7);
      expect(weekdayMonday0(col[0]!.day)).toBe(0);
    }
    expect(h.weeks.at(-1)!.some((c) => c.day === today)).toBe(true);
    expect(h.from).toBe(h.weeks[0]![0]!.day);
  });

  it("days are consecutive with no gaps or repeats", () => {
    const flat = buildHeatmap([], empty, today, 10).weeks.flat();
    for (let i = 1; i < flat.length; i++) expect(dayDiff(flat[i - 1]!.day, flat[i]!.day)).toBe(1);
  });

  it("marks the days after today as future and never counts them", () => {
    const h = buildHeatmap([addDays(today, 1), today], empty, today, 4);
    const last = h.weeks.at(-1)!;
    expect(last.filter((c) => c.future).map((c) => c.day)).toEqual([addDays(today, 1), addDays(today, 2), addDays(today, 3)]);
    expect(h.activeDays).toBe(1);
    expect(last.find((c) => c.day === addDays(today, 1))!.level).toBe(0);
  });

  it("levels follow XP and presence", () => {
    const xp = new Map([[today, 120], [addDays(today, -1), 25]]);
    const h = buildHeatmap([today, addDays(today, -1), addDays(today, -2)], xp, today, 4);
    const cell = (d: string) => h.weeks.flat().find((c) => c.day === d)!;
    expect(cell(today).level).toBe(4);
    expect(cell(addDays(today, -1)).level).toBe(2);
    expect(cell(addDays(today, -2)).level).toBe(1); // active but no XP on record
    expect(cell(addDays(today, -3)).level).toBe(0);
    expect(h.activeDays).toBe(3);
  });

  it("ignores active days outside the window", () => {
    const h = buildHeatmap(["2020-01-01"], empty, today, 4);
    expect(h.activeDays).toBe(0);
  });

  it("month labels appear once per month, at the week where it begins", () => {
    const h = buildHeatmap([], empty, today, 26);
    const labels = h.months.map((m) => m.label);
    expect(new Set(labels).size).toBe(labels.length === 7 ? 7 : labels.length); // no repeats within the window
    expect(h.months[0]!.week).toBe(0);
    for (let i = 1; i < h.months.length; i++) expect(h.months[i]!.week).toBeGreaterThan(h.months[i - 1]!.week);
  });
});

describe("xpSeries", () => {
  const today = "2026-11-12";

  it("ends at the exact total and subtracts each day's XP going backwards", () => {
    const ledger = [entry("2026-11-10", 10), entry("2026-11-11", 40), entry("2026-11-12", 25)];
    const s = xpSeries(ledger, 75, Z, today, 5);
    expect(s.points.map((p) => p.day)).toEqual(["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]);
    expect(s.points.map((p) => p.cumulative)).toEqual([0, 0, 10, 50, 75]);
    expect(s.points.map((p) => p.xp)).toEqual([0, 0, 10, 40, 25]);
    expect(s.complete).toBe(true);
  });

  it("is non-decreasing and never negative", () => {
    const ledger = Array.from({ length: 20 }, (_, i) => entry(addDays("2026-10-20", i), 10 + i));
    const total = ledger.reduce((s, e) => s + e.xp, 0);
    const s = xpSeries(ledger, total, Z, today, 30);
    let prev = 0;
    for (const p of s.points) {
      expect(p.cumulative!).toBeGreaterThanOrEqual(prev);
      prev = p.cumulative!;
    }
    expect(s.points.at(-1)!.cumulative).toBe(total);
  });

  it("includes XP earned before the ledger window in the starting level", () => {
    // Total 500 but only 30 XP in the last days: the series starts at 470.
    const s = xpSeries([entry("2026-11-12", 30)], 500, Z, today, 3);
    expect(s.points.map((p) => p.cumulative)).toEqual([470, 470, 500]);
  });

  it("marks days before a trimmed ledger as unknown instead of guessing", () => {
    const ledger = Array.from({ length: 300 }, (_, i) => entry(addDays("2026-11-01", Math.floor(i / 30)), 1, 8 + (i % 10)));
    const s = xpSeries(ledger, 5000, Z, "2026-11-12", 30);
    expect(s.complete).toBe(false);
    expect(s.points[0]!.cumulative).toBeNull();
    expect(s.knownFrom).not.toBeNull();
    expect(dayDiff(s.knownFrom!, "2026-11-12")).toBeGreaterThan(0);
    const known = s.points.filter((p) => p.cumulative !== null);
    expect(known.at(-1)!.cumulative).toBe(5000);
  });

  it("handles an empty ledger and a zero total", () => {
    const s = xpSeries([], 0, Z, today, 7);
    expect(s.points).toHaveLength(7);
    expect(s.points.every((p) => p.cumulative === 0 && p.xp === 0)).toBe(true);
    expect(s.complete).toBe(true);
  });

  it("the day key of each point matches the learner's calendar", () => {
    const s = xpSeries([], 0, Z, today, 3);
    expect(s.points.map((p) => p.day)).toEqual(["2026-11-10", "2026-11-11", "2026-11-12"]);
    expect(localDateKey(at("2026-11-12"), Z)).toBe(s.points.at(-1)!.day);
  });
});
