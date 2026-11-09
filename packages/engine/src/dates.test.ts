import { describe, expect, it } from "vitest";
import {
  addDays,
  dayDiff,
  dayNumber,
  instantFromLocal,
  isDateKey,
  isValidTimeZone,
  localDateKey,
  zoneOffsetMs,
} from "./dates";

const HOUR = 3_600_000;

describe("isDateKey", () => {
  it("accepts real dates, including leap days", () => {
    expect(isDateKey("2026-11-09")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true);
  });
  it("rejects impossible or malformed dates", () => {
    for (const bad of ["2026-02-29", "2026-13-01", "2026-00-10", "2026-4-1", "26-04-01", "", "2026-02-30", 20260101, null]) {
      expect(isDateKey(bad)).toBe(false);
    }
  });
});

describe("day arithmetic", () => {
  it("counts calendar days across month, year and leap boundaries", () => {
    expect(dayDiff("2026-02-28", "2026-03-01")).toBe(1); // 2026 is not a leap year
    expect(dayDiff("2028-02-28", "2028-03-01")).toBe(2); // 2028 is
    expect(dayDiff("2026-12-31", "2027-01-01")).toBe(1);
    expect(dayDiff("2026-11-09", "2026-11-09")).toBe(0);
    expect(dayDiff("2026-11-10", "2026-11-09")).toBe(-1);
  });
  it("addDays round-trips with dayDiff", () => {
    for (const n of [-400, -31, -1, 0, 1, 30, 365, 1000]) {
      expect(dayDiff("2026-11-09", addDays("2026-11-09", n))).toBe(n);
    }
  });
  it("dayNumber of the epoch is 0", () => expect(dayNumber("1970-01-01")).toBe(0));
  it("throws on invalid keys", () => {
    expect(() => dayNumber("2026-02-30")).toThrow(RangeError);
  });
});

describe("localDateKey", () => {
  it("returns the local day for the same instant in different zones", () => {
    const t = Date.UTC(2026, 10, 9, 23, 30); // 23:30 UTC, 9 Nov
    expect(localDateKey(t, "UTC")).toBe("2026-11-09");
    expect(localDateKey(t, "Asia/Kolkata")).toBe("2026-11-10"); // +5:30
    expect(localDateKey(t, "America/Los_Angeles")).toBe("2026-11-09");
    expect(localDateKey(t, "Pacific/Kiritimati")).toBe("2026-11-10"); // +14
    expect(localDateKey(t, "Pacific/Pago_Pago")).toBe("2026-11-09"); // -11
  });
  it("flips exactly at local midnight", () => {
    const z = "America/New_York";
    const before = instantFromLocal("2026-11-09", { hour: 23, minute: 59, second: 59 }, z);
    expect(localDateKey(before, z)).toBe("2026-11-09");
    expect(localDateKey(before + 1000, z)).toBe("2026-11-10");
  });
  it("accepts a Date as well as a number", () => {
    expect(localDateKey(new Date(Date.UTC(2026, 0, 1, 12)), "UTC")).toBe("2026-01-01");
  });
  it("rejects invalid input", () => {
    expect(() => localDateKey(NaN, "UTC")).toThrow(RangeError);
    expect(() => localDateKey(0, "Mars/Olympus_Mons")).toThrow(RangeError);
  });
});

describe("isValidTimeZone", () => {
  it("recognises IANA zones", () => {
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("Nope/Zone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone(5)).toBe(false);
  });
});

describe("zoneOffsetMs and DST", () => {
  it("New York is UTC-5 in winter and UTC-4 in summer", () => {
    expect(zoneOffsetMs(Date.UTC(2026, 0, 15, 12), "America/New_York")).toBe(-5 * HOUR);
    expect(zoneOffsetMs(Date.UTC(2026, 6, 15, 12), "America/New_York")).toBe(-4 * HOUR);
  });
  it("India has a half-hour offset and no DST", () => {
    expect(zoneOffsetMs(Date.UTC(2026, 0, 15), "Asia/Kolkata")).toBe(5.5 * HOUR);
    expect(zoneOffsetMs(Date.UTC(2026, 6, 15), "Asia/Kolkata")).toBe(5.5 * HOUR);
  });
});

describe("instantFromLocal", () => {
  it("round-trips local wall time to the same local day", () => {
    for (const z of ["UTC", "America/New_York", "Europe/London", "Asia/Kolkata", "Pacific/Auckland", "Pacific/Kiritimati"]) {
      for (const key of ["2026-01-01", "2026-03-08", "2026-03-29", "2026-11-01", "2026-12-31"]) {
        for (const hour of [0, 1, 12, 23]) {
          const t = instantFromLocal(key, { hour, minute: 30 }, z);
          expect(localDateKey(t, z), `${z} ${key} ${hour}:30`).toBe(key);
        }
      }
    }
  });
  it("US spring-forward day is 23 hours long, fall-back day is 25", () => {
    const z = "America/New_York";
    const len = (key: string, next: string) =>
      (instantFromLocal(next, {}, z) - instantFromLocal(key, {}, z)) / HOUR;
    expect(len("2026-03-08", "2026-03-09")).toBe(23);
    expect(len("2026-11-01", "2026-11-02")).toBe(25);
    expect(len("2026-06-01", "2026-06-02")).toBe(24);
  });
});
