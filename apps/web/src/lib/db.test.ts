import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { SCHEMA_VERSION, emptySnapshot, type ProgressEvent } from "@aiforge/engine";
import {
  AIForgeDB,
  MAX_BACKUPS,
  NewerVersionError,
  dispatchEvent,
  exportText,
  importText,
  loadSnapshot,
  resetAll,
} from "./db";

const Z = "Europe/London";
const T0 = Date.UTC(2026, 0, 10, 12);
const DAY = 86_400_000;

let n = 0;
let db: AIForgeDB;
let name: string;
beforeEach(() => {
  name = `test-db-${++n}`;
  db = new AIForgeDB(name);
});

const step = (id: string): ProgressEvent => ({ type: "step-complete", id });

describe("loading", () => {
  it("creates an empty snapshot on first use", async () => {
    const r = await loadSnapshot(db, Z, T0);
    expect(r.status).toBe("created");
    expect(r.snapshot.xpTotal).toBe(0);
  });

  it("returns the same data after a simulated page reload (new connection)", async () => {
    await dispatchEvent(db, step("a"), T0, Z);
    db.close();
    const reopened = new AIForgeDB(name);
    const r = await loadSnapshot(reopened, Z, T0 + 1000);
    expect(r.status).toBe("ok");
    expect(r.snapshot.xpTotal).toBe(10);
    expect(Object.keys(r.snapshot.steps)).toEqual(["a"]);
  });
});

describe("dispatch", () => {
  it("persists XP, streak and steps", async () => {
    const r = await dispatchEvent(db, step("a"), T0, Z);
    expect(r.xpGained).toBe(10);
    const { snapshot } = await loadSnapshot(db, Z, T0);
    expect(snapshot.streak.current).toBe(1);
  });

  it("concurrent events never lose updates (atomic transactions)", async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => dispatchEvent(db, step(`s${i}`), T0 + i, Z)));
    const { snapshot } = await loadSnapshot(db, Z, T0);
    expect(snapshot.xpTotal).toBe(250);
    expect(Object.keys(snapshot.steps)).toHaveLength(25);
  });

  it("two separate connections writing at once also do not lose updates", async () => {
    const other = new AIForgeDB(name);
    await Promise.all([
      ...Array.from({ length: 10 }, (_, i) => dispatchEvent(db, step(`a${i}`), T0 + i, Z)),
      ...Array.from({ length: 10 }, (_, i) => dispatchEvent(other, step(`b${i}`), T0 + 100 + i, Z)),
    ]);
    const { snapshot } = await loadSnapshot(db, Z, T0);
    expect(Object.keys(snapshot.steps)).toHaveLength(20);
    expect(snapshot.xpTotal).toBe(200);
  });

  it("a streak builds across days", async () => {
    await dispatchEvent(db, step("a"), T0, Z);
    await dispatchEvent(db, step("b"), T0 + DAY, Z);
    const { snapshot } = await loadSnapshot(db, Z, T0 + DAY);
    expect(snapshot.streak.current).toBe(2);
  });
});

describe("damaged and newer data", () => {
  it("keeps a copy of corrupt data and starts fresh, telling the learner", async () => {
    await db.snapshot.put({ id: "main", schemaVersion: 1, data: { schemaVersion: 1, xpTotal: "lots" }, updatedAt: T0 });
    const r = await loadSnapshot(db, Z, T0);
    expect(r.status).toBe("recovered");
    expect(r.message).toMatch(/copy was kept/);
    const backups = await db.backups.toArray();
    expect(backups).toHaveLength(1);
    expect(backups[0]!.reason).toBe("corrupt-on-load");
    expect((backups[0]!.data as { xpTotal: string }).xpTotal).toBe("lots");
  });

  it("never overwrites data saved by a newer app version", async () => {
    const future = { ...emptySnapshot(Z, T0), schemaVersion: SCHEMA_VERSION + 1, mystery: true };
    await db.snapshot.put({ id: "main", schemaVersion: SCHEMA_VERSION + 1, data: future, updatedAt: T0 });
    const r = await loadSnapshot(db, Z, T0);
    expect(r.status).toBe("newer-version");
    await expect(dispatchEvent(db, step("a"), T0, Z)).rejects.toBeInstanceOf(NewerVersionError);
    const row = await db.snapshot.get("main");
    expect((row!.data as { mystery: boolean }).mystery).toBe(true);
  });
});

describe("export and import", () => {
  it("round-trips: export from one browser, import into another", async () => {
    await dispatchEvent(db, step("a"), T0, Z);
    await dispatchEvent(db, { type: "boss-result", id: "b", score: 0.9 }, T0, Z);
    const text = await exportText(db, T0 + 5, Z);

    const other = new AIForgeDB(`${name}-other`);
    const res = await importText(other, text, "replace", T0 + 10, Z);
    expect(res.ok).toBe(true);
    const { snapshot } = await loadSnapshot(other, Z, T0 + 20);
    expect(snapshot.xpTotal).toBe(110);
    expect(snapshot.bosses.b!.best).toBe(0.9);
  });

  it("replace backs up the current data first", async () => {
    await dispatchEvent(db, step("mine"), T0, Z);
    const donor = new AIForgeDB(`${name}-donor`);
    await dispatchEvent(donor, step("theirs"), T0, Z);
    await importText(db, await exportText(donor, T0, Z), "replace", T0 + 1, Z);
    const { snapshot } = await loadSnapshot(db, Z, T0 + 2);
    expect(Object.keys(snapshot.steps)).toEqual(["theirs"]);
    const backups = await db.backups.toArray();
    expect(backups.map((b) => b.reason)).toContain("before-import-replace");
  });

  it("merge keeps both devices' progress", async () => {
    await dispatchEvent(db, step("mine"), T0, Z);
    const donor = new AIForgeDB(`${name}-donor2`);
    await dispatchEvent(donor, step("theirs"), T0 + DAY, Z);
    await importText(db, await exportText(donor, T0, Z), "merge", T0 + 1, Z);
    const { snapshot } = await loadSnapshot(db, Z, T0 + 2);
    expect(Object.keys(snapshot.steps).sort()).toEqual(["mine", "theirs"]);
  });

  it("a bad file changes nothing", async () => {
    await dispatchEvent(db, step("mine"), T0, Z);
    for (const bad of ["{not json", '{"kind":"other"}', JSON.stringify({ kind: "aiforge-progress", snapshot: { schemaVersion: 1 } })]) {
      const res = await importText(db, bad, "replace", T0 + 1, Z);
      expect(res.ok).toBe(false);
    }
    const { snapshot } = await loadSnapshot(db, Z, T0 + 2);
    expect(snapshot.xpTotal).toBe(10);
    expect(await db.backups.count()).toBe(0);
  });

  it("refuses to import over data from a newer app version", async () => {
    const donor = new AIForgeDB(`${name}-donor3`);
    await dispatchEvent(donor, step("x"), T0, Z);
    const text = await exportText(donor, T0, Z);
    await db.snapshot.put({
      id: "main",
      schemaVersion: SCHEMA_VERSION + 1,
      data: { ...emptySnapshot(Z, T0), schemaVersion: SCHEMA_VERSION + 1 },
      updatedAt: T0,
    });
    const res = await importText(db, text, "replace", T0 + 1, Z);
    expect(res.ok).toBe(false);
  });
});

describe("backups and reset", () => {
  it("keeps only the most recent backups", async () => {
    for (let i = 0; i < MAX_BACKUPS + 3; i++) {
      await dispatchEvent(db, step(`s${i}`), T0 + i, Z);
      await resetAll(db, T0 + 1000 + i, Z);
    }
    expect(await db.backups.count()).toBe(MAX_BACKUPS);
  });

  it("reset erases progress but keeps a backup of it", async () => {
    await dispatchEvent(db, step("a"), T0, Z);
    const fresh = await resetAll(db, T0 + 1, Z);
    expect(fresh.xpTotal).toBe(0);
    const backups = await db.backups.toArray();
    expect(backups).toHaveLength(1);
    expect((backups[0]!.data as { xpTotal: number }).xpTotal).toBe(10);
  });
});
